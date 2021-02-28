const Discord = require('discord.js');
const radio = require("./radio.js")
const client = new Discord.Client({
    presence:{
        activity: {
            name: "+help for commands",
            type: "LISTENING"
        }
    },
    ws : {
        intents: [
            'GUILDS', 
            'GUILD_MESSAGES',
            "GUILD_VOICE_STATES"
        ]
    }
});
const {
	prefix,
	token,
	logchannel,
} = require('./config.json');


let stationPlaying;
let streamPlaying;
let streamConnection;
let streamDispatcher;

client.once('ready', async () => {
	console.log(`Locked and loaded! - ${stationDirectoryLength} stations ready!`);
});


client.on('message', async message => {
	//Ignores the message if sent from a bot
	if(message.author.bot || message.channel.type === "dm" ) return;

    
    if (message.content.startsWith(prefix)){
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift();
        //Checks if the member is in a voice channel
        if(message.member?.voice?.channel === null)
            return message.channel.send("You are currently not in a voice channel");
        //Checks if the member is in the same voice channel as the bot
        if(message.guild?.voice?.channel?.id !== undefined && message.guild?.voice?.channel?.id !== message.member?.voice?.channel?.id)
            return message.channel.send("You must be in the same channel as the bot to perform this command");

        switch(command){
            case("radio"):
                radio(args, message.member.voice.channel);
            default: (message.channel.send("Invalid command"))
        }
    }
});

client.login(token);