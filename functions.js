module.export = {
    memberInVoice,
	clientLogMessage
}

function memberInVoice(member){
	if(message.member?.voice?.channel === null){
		message.channel.send("You are currently not in a voice channel");
		return false;
	}
	else{
		message.member.voice.channel.join();
		return true;
	}
}

function clientLogMessage(logchannel) {
	client.channels.fetch(logchannel).then(channel => {
		channel.send(message)
	}).catch(e => console.log(e));	
	console.log(message);
}

function setStreamStatus(){
	if(icyReader === undefined)
		clientLogMessage("Radio is currently not playing");
	else{
		if(icyReader.isPaused()){
			icyReader.resume();
			clientLogMessage("Now playing is turned on");
		}
		else{
			icyReader.pause();
			clientLogMessage("Now playing is turned off");	
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