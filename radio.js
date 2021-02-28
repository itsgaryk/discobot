const icy = require('icy');
const fetch = require("node-fetch");
const AbortController = require("abort-controller")

const stationList = require("./stations-saved.json");
const stationDirectory = require("./stations-database.json");
const stationDirectoryLength = stationDirectory.length;
let icyReader;

//Gets all countries for radios.json
const getCountries = (countries) => {
	const newList = [];
	for(let i = 0; i < countries.length; i++){
		if(!newList.some(i => i === countries[i]))
			newList.push(countries[i]);
	}
	return newList;
}
const countries = getCountries(stationDirectory.map(i => i.country));

module.export = function (args){
    const randomStation = (list) => {
		return list[Math.floor(Math.random() * Math.floor(list.length))];
	}

	//0 Arguments - Plays a random radio station from the database
	if(args[0] === undefined){
		playStation(voice, randomStation(radios),1);
		return;
	}
	
	//1 Argument only
	if(args[1] === undefined){
		//Checks if the argument is "saved"
		if(args[0] === "saved"){
			playStation(voice, randomStation(list))
			return;
		}
		//Checks if the argument is a number (for saved stations)
		for(let i = 0; i < list.length; i++){
			if (Number (args[0]) === i+1){
				playStation(voice, list[i])
				return;
			}
		}

	//Checks if the custom URL is valid
	try{
		const testURL = new URL(args[0]);
		if(checkURL(args[0])){
			playStation(voice, {name:"", url:args[0]});
			return;
		}else{
			clientLogMessage("Invalid URL");
			return;
		}	
	}
	catch(e){
		console.log("Not a URL. Could be a country");
	};


	//2 or more arguments
	
	//Checks if the arguments are a country
	const country = args;
	country.join(" ");
	if(countries.find(i => i.toLowerCase() === country)){
		const newList = radios.map(i => i.country === country);
		if(newList.length > 0){
			playStation(voice, randomStation(newList));
			return;
		}
		else{
			clientLogMessage("The country does not have any radio stations");
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
	}else{
		clientLogMessage(`Unable to find a station based on your criteria`);
		return;
	}
}
function validateURL(voice, station, getStreamInfo){
    console.log(`Checking radio station ${station.name} - ${station.url}`);

    const controller = new AbortController();
    const signal  = controller.signal
    const timeout = setTimeout(() => controller.abort(), 1000);

    fetch(station.url, {signal: controller.signal})
    .then(res => {

        //console.log(res);
        clearTimeout(timeout);

        stationPlaying = station;
        clientLogMessage(`**Connected to Radio Station:** \`${stationPlaying?.name}\`\t **From:** \`${stationPlaying?.location}, `
        + `${stationPlaying?.country}\`\t **Website:** \`${stationPlaying?.website}\``);

        getStreamInfo(station.url)
        playStream(voice, station.url)
        
    })
    .catch(error => {
        console.log(error.code + "\tInvalid URL or SHOUTCAST server is not responding");
    })
}

function getICY(url){
    
    if(icyReader !== undefined) icyReader.removeAllListeners();

    icy.get(url, i => {

        icyReader = i;

        i.on('metadata', metadata => {
                
                let icyData = icy.parse(metadata);
                if(icyData?.StreamTitle){
                    streamPlaying = icyData.StreamTitle;
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