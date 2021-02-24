const Discord = require('discord.js');
const icy = require('icy');
const fs = require('fs');
const client = new Discord.Client();
const {
	prefix,
	token,
	logchannel,
	radio,
	list
} = require('./config.json');

var serverQueue = [...list];

client.once('ready', () => {
	console.log("Locked and loaded!");
	//playStream();
});

/*
client.once('reconnecting', () => {
	clientLogMessage("Status: Reconnected to discord");
	//playStream();
});


client.once('disconnect', () => {
	clientLogMessage("Status: Disconnected from discord");
});
*/

client.on('message', async message => {
	if (message.author.bot) return;
	if(message.content.startsWith(prefix)){
		const args = message.content.slice(prefix.length).split(' ');
		const command = args.shift().toLowerCase();
		switch(command)
		{
			case "radio":
				if(args[0] === undefined)
					return message.channel.send("You did not enter a Radio Station index number");
				if(message.member?.voice?.channel === null)
					return message.channel.send("You are currently not in a voice channel");
				try{
					const radioURL = new URL (args[0])
					message.channel.send("Playing your radio station")
					.then(m => {
						playStream(message.member.voice.channel, args[0]);
					});
					return;
				}
				catch{
					for(let i = 0; i < radio.length; i++){

						if ((args[0] - 1) === i)
							if(message.member.voice.channel?.id === null)
								return message.channel.send("You are not in a voice channel");
							else{
								message.channel.send("Playing the following station: " + radio[i].name)
								.then(m => {
									playStream(message.member.voice.channel, radio[i].url);
								});
								return;
							}
					};
				}
				message.channel.send("Missing or invalid arguments");
				break;
			case "list":
				const theMessage = []
				theMessage.push("List of available radio stations.\n");
				for(let i = 0; i < radio.length; i++){
					theMessage.push(i+1 + ". " + radio[i].name + "\n");
				}
				message.channel.send(theMessage.join(""));
				break;
			default: message.channel.send("Invalid command");
		}
	}
});

client.login(token);

function playStream(channel, url) {
	channel.join().then(connection => {
			//clientLogMessage("Status: Successfully connected to voice channel");
			
			connection.on("debug", e => {
				if (e.includes('[WS] >>') || e.includes('[WS] <<')) return;
				//clientLogMessage("Status: Connection warning - " + e);
				//if(e.includes('[WS] closed')) abortWithError();
			});
			connection.on("disconnect", () => {
				clientLogMessage("Status: Connection disconnect");
			});
			connection.on("error", e => {
				clientLogMessage("Status: Connection error. See logs");
				console.log(e);
			});
			connection.on("failed", e => {
				clientLogMessage("Status: Connection failed. See logs");
				console.log(e);
			});
			connection.on("finish", () => {
				return;
			});
	initDispatcher(connection, url);
	}).catch(e => {
		console.log(e);
	})
}

async function initDispatcher(connection, url) {
	const streamDispatcher = connection.play(url, {
			volume: false,
			highWaterMark: 512,
			bitrate: 128,
			fec: true
		})
	streamDispatcher.on("finish", () => {
			console.log("finish");
			//clientLogMessage("Status: Broadcast was finished");
			streamDispatcher.destroy();
			//initDispatcher(connection, url);
		});
			
	streamDispatcher.setBitrate(128);
	streamDispatcher.setFEC(true);
	
	streamDispatcher.on("debug", e => {
		clientLogMessage("Status: Dispatcher warning - " + e);
	});
	streamDispatcher.on("error", e => {
		clientLogMessage("Status: Broadcast connection error");
		console.log(e);
		abortWithError();
	});

	const icyReader = icy.get(url, i => {
		i.on('metadata', metadata => {
			let icyData = icy.parse(metadata);
			if (icyData.StreamTitle) clientLogMessage("Now playing: " + icyData.StreamTitle);
		});
		i.resume();
	});
}
function abortWithError() {
	clientLogMessage("Status: The connection to the radio station is interrupted or it does not respond, interrupting the process");
	streamDispatcher.destroy();
	process.exit(1);
}

function clientLogMessage(message) {
	client.channels.fetch(logchannel).then(channel => {
		channel.send(message)
	}).catch(e => console.log(e));	
	console.log(message);
}