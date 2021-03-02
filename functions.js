const fs = require("fs")
const icy = require("icy")
const fetch = require("node-fetch");
const AbortController = require("abort-controller")

const stationDirectory = require("./stations-directory.json");
const stationSaved = require("./stations-saved.json");
const randomStationList = [];

let logchannel = null;
let icyReader = null;
let autoNowPlaying = null;
let radioStation = null;
let nowPlaying = null;

let streamConnection = null;
let streamDispatcher = null;

module.exports = {
	configLogChannel,
	commandRadio,
	commandList,
	commandInfo,
	commandSave,
	commandStop,
	commandAuto
}

//Used in client.once("ready") to get the Discord channel object
function configLogChannel(channel){
	logchannel = channel
}

function commandList(args){
		clientLogMessage("Saved radio stations. Enter +radio [number] e.g. \`+radio 1\` to play it\n\n" +
			stationSaved.map(i => stationSaved.indexOf(i)+1 + ".\t" + i.name + "\n").join(""));
		/*
		if(args[0] !== undefined) Number.parseInt(args[0]);
		if(args[1] !== undefined) return clientLogMessage("Error: only one argument allowed");
		if(args[0] > stationSaved.length) return clientLogMessage("Error: invalid number. You can only enter a number up to " + stationSaved.length);
		const stations = stationSaved.filter(i => stationSaved.indexOf(i)>=1+args[0]*10 &&  list.indexOf(i)>=1+args[0]*10+10)
		clientLogMessage(`Displaying radio stations ${i+(args[0]*10)} - ${args[0]*10+10}` +
			"Favourited stations. Enter +radio [number] e.g. \`+radio 1\`\n\n" + stations.map(i => stationSaved.indexOf(i)+1 + ".\t" + i.name + "\n").join(""));
		*/
}

//Returns a random radio station from a submitted list
function getRandomStation(list){
		return list[Math.floor(Math.random() * Math.floor(list.length))];
	}

function commandAuto(){
	if(icyReader !== null){
		if(icyReader.isPaused())
		{
			autoNowPlaying === true;
			icyReader.resume();
			clientLogMessage("Auto \"Now Playing\" is turned on");
		}
		else
		{
			autoNowPlaying === false;
			icyReader.pause();
			clientLogMessage("Auto \"Now Playing\" is turned off");
		}
	}
	else
		clientLogMessage("Radio is currently not playing");
}

function commandRadio(voice, args){
	//0 arguments
	//Plays a random radio station from the database
	if(args[0] === undefined){
		playRadio(voice, getRandomStation(stationDirectory), "random");
		return;
	}

	//1 argument only
	if(args[1] === undefined){	
		//Checks if the argument is a number (for saved stations)
		try{
			const checkNumber = Number.parseInt(args[0]);
			for(let i = 0; i < stationSaved.length; i++){
				if (checkNumber === i+1){
					playRadio(voice, stationSaved[i]);
					return;
				}
			}
		} catch(e){}

		//Checks if the argument is a URL
		try{
			const testURL = new URL (args[0]);
			playRadio(voice, {url:args[0]});
			return;
		} catch(e){}
	}

	//1 or more arguments 
	//Smart search. Checks all properties in each Object
	for(const item of stationDirectory){
		for(const property in item){
			if(item[property].toLowerCase() === args.join(" ").toLowerCase()){
				randomStationList.push(item);
			}
		}
	}
	if(randomStationList.length === 1){
		clientLogMessage(`Found 1 result for **${args.join(" ")}**`);
		playRadio(voice, randomStationList.shift());
		return;
	}
	if(randomStationList.length > 1){
		clientLogMessage(`Found ${randomStationList.length} results for **${args.join(" ")}**`);
		playRadio(voice, getRandomStation(randomStationList), "filter");
		return;
	}

	//2 or more arguments
	//Search by field/property name
	const attributes = Object.keys(stationDirectory[0])
	const attribute = args.shift()
	if(attributes.some(i => i === attribute)){
		for(const item of stationDirectory){
			for(const property in item){
				if(property === attribute)
					if(item[property].toLowerCase() === args.join(" ").toLowerCase())
						randomStationList.push(item);
			}
		}
		if(randomStationList.length === 1){
			clientLogMessage(`Found 1 result for **${attribute}** - \`${args.join(" ")}\``,);
			playRadio(voice, randomStationList.shift())
			return;
		}
		if(randomStationList.length > 1){
			clientLogMessage(`Found ${randomStationList.length} results for **${attribute}** - \`${args.join(" ")}\``,);
			playRadio(voice, getRandomStation(randomStationList), "filter")
			return;
		}
	}
	//If unsuccessful
	clientLogMessage(`Unable to find a station based on your search criteria`);
}

function commandStop(){
	if(streamDispatcher !== null){
		streamDispatcher.destroy();
		radioStation = null;
		nowPlaying = null;
		if(icyReader !== null) icyReader.removeAllListeners();
		if(streamConnection !== null) streamConnection.removeAllListeners();
		//clientLogMessage("Playback is stopped")
		
	}
	else{
		clientLogMessage("Nothing is currently playing");
	}
}

function playRadio(voice, station, type){
	const getICY = () => {
		icy.get(station.url, i => {
			icyReader = i;

			i.on('metadata', metadata => {
				const genericMessages = [
					"Use HTTP to feed the song name",
					"-",
					"Live",
					"",
					null,
					undefined
				]
				let icyData = icy.parse(metadata);
				
				if(icyData?.StreamTitle !== null){
					if((genericMessages.some(m => m === icyData.StreamTitle) || icyData.StreamTitle.length < 3) && nowPlaying !== `Unable to find track info`){
							nowPlaying = `Unable to find track info`;
							clientLogMessage(nowPlaying);
					}else{
						if(icyData.StreamTitle !== nowPlaying){
							nowPlaying = icyData.StreamTitle;
							clientLogMessage("Now playing: " + icyData.StreamTitle);
						}
					}							
				}else{
					nowPlaying = `Unable to find now playing info`;
					clientLogMessage(nowPlaying);
				}
			})
			
			i.on("error", error => {
				console.log(error.code + "Error when trying to retrieve metadata")
				nowPlaying = `Unable to find track info`;
				clientLogMessage(nowPlaying);
				i.destroy();
				icyData = null;
			})
			i.resume();
		})
	}

	if (radioStation?.url === station?.url){
		clientLogMessage("Radio sation is already playing");
		return;
	}

	console.log(`CHECKING: radio station ${station.name} - ${station.url}`);
	validateURL(station.url).then(() => {
		console.log("SUCCESS: validated stream URL")

		if(streamDispatcher !== null) commandStop();
		radioStation = station;
		//If all properties are present send the full message
		let counter = 0;
		for(const property in radioStation){
			if(radioStation[property] !== null && radioStation[property] !== "")
				counter++;
		}
		if(counter === Object.keys(radioStation).length){
			clientLogMessage(`**Connecting to Radio Station:** \`${radioStation?.name}\`\t **From:** \`${radioStation?.location}, `
			+ `${radioStation?.country}\`\t **Website:** \`${radioStation?.website}\``);
		}else{
			clientLogMessage("Now Playing - " + radioStation.url);
		}
		getICY();
		playStream(voice)
		randomStationList.splice(0, randomStationList.length);
		//Disables auto Now Playing if false
		if(autoNowPlaying === false)
			icyReader.pause();
	})
	//The catch will trigger when the validateURL method fails the HTTP fetch request
	.catch(error => {
		console.log(error + "Invalid URL or SHOUTCAST server took too long to respond");
		switch(type){
			case "random":
				playRadio(voice, getRandomStation(stationDirectory), "random"); break;
			case "filter":
				if(randomStationList.length > 5) playRadio(voice, getRandomStation(randomStationList), "filter"); break;
			default:
				clientLogMessage("Failed to connect to radio station"); break;

		}
	});
}

async function validateURL(url){
	const controller = new AbortController();
	const signal  = controller.signal
	const timeout = setTimeout(() => controller.abort(), 1500);

	await fetch(url, {signal: controller.signal})
}

function clientLogMessage(message) {
	logchannel.send(message);
	//console.log(message);
}

function commandInfo(){
	if(radioStation === null){
		clientLogMessage("Nothing is currently playing");
	}else{
		if(radioStation?.location === null)
			clientLogMessage(`**You're listening to **\`${radioStation.name}\`\nCurrently Playing: ${nowPlaying}`);
		else
			clientLogMessage(`**You're listening to** \`${radioStation.name}\`\t**Broadcasting from** \`${radioStation.location}, ${radioStation.country}\`\nCurrently Playing: ${nowPlaying}`);
	}
}

function commandSave(){
	if(radioStation === null){
		clientLogMessage("A radio station must be playing in order to be saved");
	}else{
		for(const item of stationSaved){
			if (item.url === radioStation){
				clientLogMessage("The radio station is already in the list");
				return
			}
		}
		stationSaved.push(radioStation);
		fs.writeFileSync("stations-saved.json",JSON.stringify(stationSaved, null, 2));
		clientLogMessage("Station successfully added to your favourite list");
	}
}

function playStream(voice){
    if(streamConnection === null)
        voice.join()
		.then(async connection => {
			streamConnection = connection;
			connection.on("debug", e => {
				if (e.includes('[WS] >>') || e.includes('[WS] <<')) return;
				console.log("Status: Connection warning - " + e);
				if(e.includes('[WS] closed')) commandStop();
			});
			connection.on("disconnect", () => {
				console.log("Bot disconnected from channel");
				commandStop();
			});
			connection.on("error", e => {
				clientLogMessage("Status: Error. See logs");
				console.log(e);
				commandStop();
			});
			connection.on("finish", () => {
				console.log("Left the voice channel")
			});
			initDispatcher(connection);
		})
		.catch(error => {
			console.log(error.code + "Error when trying to play");
    	});
    else
        initDispatcher(streamConnection);
}        

function initDispatcher(connection) {
    
    streamDispatcher = connection.play(radioStation.url, {
        volume: false,
        highWaterMark: 512,
        bitrate: 128,
        fec: true
    })

    streamDispatcher.setBitrate(128);
    streamDispatcher.setFEC(true);

	streamDispatcher.once("speaking", () => {
		console.log("SUCCESS: streaming URL")
	})

    streamDispatcher.on("finish", () => {
		commandStop();
		clientLogMessage("Status: Radio station has stopped broadcasting");
		//if(type === "filter") playRadio();
    });	

	//On spams the error message like Failed to send a packet - no UDP socket
    streamDispatcher.once("debug", e => {
        clientLogMessage("Status: Dispatcher warning - " + e);
		commandStop();
    });

    streamDispatcher.on("disconnect", () => {
        clientLogMessage("Status: Connection disconnect");
    });

    streamDispatcher.on("error", e => {
        clientLogMessage("Status: Broadcast connection error");
        console.log(e);
    });
}