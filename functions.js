const icy = require("icy")
const fetch = require("node-fetch");
const AbortController = require("abort-controller")

const player = require("./player.js")

const testMe = "hello"
let logchannel;
let icyReader;
let radiostation;
let nowPlaying;
const stream = {connection:null, dispatcher:null}
const stationDirectory = require("./stations-database.json");
const stationDirectoryLength = stationDirectory.length;
const stationCustomDirectory = require("./stations-saved.json");

//only used internall by stationDirectoryCountries
const getCountries = () => {
	const newList = [];
	for(let i = 0; i < stationDirectoryLength; i++){
		if(!newList.some(i => i === stationDirectory[i]?.country))
			newList.push(stationDirectory[i].country)
	}
	return newList;
}

const stationDirectoryCountries = getCountries();

module.exports = {
	configLogChannel,
	commandRadio,
}

//Used in client.once("ready") to get the Discord channel object
function configLogChannel(channel){
	logchannel = channel
}

function commandRadio(voice, args){
	//Returns a random radio station from a submitted list
	const getRandomStation = (list) => {
		return list[Math.floor(Math.random() * Math.floor(list.length))];
	}

	//0 Arguments - Plays a random radio station from the database
	if(args[0] === undefined){
		const randomStation = getRandomStation(stationDirectory)
			playRadio(voice, randomStation)
		return;
	}
/*
	//1 Argument only
	if(args[1] === undefined){
		//Checks if the argument is a number (for saved stations)
		try{
			const checkNumber = Number.parseInt(args[0]);
			for(let i = 0; i < list.length; i++){
				if (Number (arg) === i+1){
					validateURL(voice, stationList[arg])
					return true;		
				}
			}
		} catch (e){}
		//Checks if the argument is a URL
		try{
			const testURL = new URL (args[0]);
			functions.validateURL()
		} catch(e){}
	}

	//Checks if the arguments are a country - a country can be more than 1 word
	const country = args.join(" ")
	for(let i = 0; i < countries.length; i++)
		if(countries[i].toLowerCase() === country)){
			const newList = radios.map(i => i.country === country);
			playRadio()
			return;
		}
	}

	//Checks if the first argument is one of the radio properties
	const attributes = Object.keys(radios[0])
	args.shift()
	//Iterating stations in the database
	const newList = radios.map(i => {
		//Iterating attributes
		for(let j = 0; j < attributes.length; j++){
			//Checks for the property
			if(i[attributes[j]] !== undefined){
				//Checks if the property has the value of the remaining arguments
				if(i[attributes[j]] === args.join(" ")){
					return i;
				}
			}
		}
	})

	//Checks if the iterator found any stations matching the user's criteria
	if(newList.length > 0){
		playStation(voice, randomStation(newList));
		return;
	} else {
		clientLogMessage(`Unable to find a station based on your search criteria`);
		return;
	}
*/
}

function playRadio(voice, station){

	//Checks if URL is valid
	const validateURL = async (url) => {
		console.log(`Checking radio station ${station.name} - ${station.url}`);
	
		const controller = new AbortController();
		const signal  = controller.signal
		const timeout = setTimeout(() => controller.abort(), 1000);
	
		await fetch(url, {signal: controller.signal})
		.catch(error => console.log(error.code + "\tInvalid URL or SHOUTCAST server is not responding"))
		clearTimeout(timeout);	
	}
	
	const getICY = (url) => {
		if(icyReader !== undefined) icyReader.removeAllListeners();
	
		icy.get(url, i => {
			icyReader = i;
			i.on('metadata', metadata => {
					
					let icyData = icy.parse(metadata);
					if(icyData?.StreamTitle){
						nowPlaying = icyData.StreamTitle;
						clientLogMessage("Now playing: " + icyData.StreamTitle)
					}
					else
						streamPlaying = `Unable to retrieve song info`;
			})
	
			i.on("error", error => {
				console.log(error.code)
				clientLogMessage("Unable to retrieve song info");
				controller.abort();
			})
	
			i.resume();
		})
	}

	validateURL().then(() => {

		//Populates property values with null if empty or non-existent
		if(station?.name === null)
			clientLogMessage("Connected to unknown radio station")
			station.name = null;
		//If all properties are present send the full message
		if(station?.name !== null && station?.location !== null && station?.country !== null)
			clientLogMessage(`**Connected to Radio Station:** \`${station?.name}\`\t **From:** \`${station?.location}, `
		+ `${station?.country}\`\t **Website:** \`${station?.website}\``);

		if(station?.location === null)
			station.location = null;
		if(station?.country === null)
			station.country = null;

		radioStation = station;

		getICY(stream.station.url)
		playRadio(voice, stream)
	})
	.catch(error => console.log(error.code + "\tSomething went wrong"));
}

function clientLogMessage(message) {
	logchannel.send(message)
	console.log(message);
}
/*
function commandAuto(){
	if(icyReader === undefined)
		clientLogMessage("Radio is currently not playing");
	else{
		if(icyReader.isPaused()){
			icyReader.resume();
			clientLogMessage("Auto Display is turned on");
		}
		else{
			icyReader.pause();
			clientLogMessage("Auto Display is turned off");	
		}
	}
}

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

function getSavedStations(){
	//theMessage.push("List of available radio stations.\n");
	const stations = list.map(i => list.indexOf(i)+1 + ".\t" + i.name + "\n");
	clientLogMessage("Favourited stations. Enter +radio [number] e.g. \`+radio 1\`\n\n" + stations.join(""));
}

function saveRadioStation(){
	list.push(radioStation);
	fs.writeFileSync(JSON.stringify(list))
}

function stopStream(){
	if(streamDispatcher !== ""){
		streamDispatcher.destroy();
		clearRadioPlaying();
		icyReader.removeAllListeners();
		clientLogMessage("Player has stopped");
	}
	else
		clientLogMessage("Nothing is currently playing");
}
*/