const icy = require("icy")
const fetch = require("node-fetch");
const AbortController = require("abort-controller")

const stationDirectory = require("./stations-directory.json");
const stationSaved = require("./stations-saved.json");
const randomStationList = [];

let logchannel;
let icyReader;
let autoNowPlaying;
let radioStation;
let nowPlaying;

let streamConnection;
let streamDispatcher;

module.exports = {
	configLogChannel,
	commandRadio,
	commandStop,
	commandAuto
}

//Used in client.once("ready") to get the Discord channel object
function configLogChannel(channel){
	logchannel = channel
}

//Returns a random radio station from a submitted list
function getRandomStation(list){
		return list[Math.floor(Math.random() * Math.floor(list.length))];
	}

function commandAuto(){
	if(icyReader !== undefined){
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
			clientLogMessage(`Found ${randomStationList.length} result for **${attribute}** - \`${args.join(" ")}\``,);
			playRadio(voice, getRandomStation(randomStationList), "filter")
			return;
		}
	}
	//If unsuccessful
	clientLogMessage(`Unable to find a station based on your search criteria`);
}

function commandStop(){
	if(streamDispatcher !== undefined){
		streamDispatcher.destroy();
		if(icyReader !== undefined) icyReader.removeAllListeners();
		if(streamConnection !== undefined) streamConnection.removeAllListeners();
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
				icyData = undefined;
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

		if(streamDispatcher !== undefined) commandStop();
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
				playRadio(voice, getRandomStation(stationDirectory)); break;
			case "filter":
				if(randomStationList.length > 0) playRadio(voice, getRandomStation(randomStationList)); break;
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
/*
function getStationInfo(){
	if(radioPlaying?.url === "" || radioPlaying?.name === "")
		clientLogMessage("Currently not playing a radio station");
	else
		internetRadio.getStationInfo(radioPlaying.url, (error, station) => {
			if(radioPlaying?.location === null)
				clientLogMessage(`**You're listening to **\`${radioPlaying.name}\``);
			else
				clientLogMessage(`**You're listening to **\`${radioPlaying.name}\` **playing from** 
				\`${radioPlaying.location}, ${radioPlaying.country}\` - \`${radioPlaying.website}\``);
			if(station?.title === null || station?.title === "")
				clientLogMessage(`Unable to retrieve song info`);
			else
				clientLogMessage(`Currently Playing: \`${station?.title}\``);
			}, internetRadio.StreamSource.STREAM);
}

function commandList(){
	//theMessage.push("List of available radio stations.\n");
	const stations = list.map(i => list.indexOf(i)+1 + ".\t" + i.name + "\n");
	clientLogMessage("Favourited stations. Enter +radio [number] e.g. \`+radio 1\`\n\n" + stations.join(""));
}

function commandSave(){
	list.push(radioStation);
	fs.writeFileSync(JSON.stringify(list))
}
*/

function playStream(voice){
    if(streamConnection === undefined)
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