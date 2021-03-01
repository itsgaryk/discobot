const Discord = require('discord.js');
const functions = require("./functions.js")
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


client.once('ready', () => {
	console.log(`Locked and loaded!`);
    client.channels.fetch(logchannel)
    .then(channel => {
        functions.configLogChannel(channel);
        console.log("Log channel configured for functions.js");
    })
    .catch(error => console.log(error + "\tSomething went wrong"));
});

client.on('message', async message => {
    const isInVoice = () => {
        //Checks if the member is in a voice channel
        if(message.member?.voice?.channel === null)
            {message.channel.send("You are currently not in a voice channel"); return false;}
        //Checks if the member is in the same voice channel as the bot
        if(message.guild?.voice?.channel?.id !== null && message.guild?.voice?.channel?.id !== message.member?.voice?.channel?.id)
            {message.channel.send("You must be in the same channel as the bot to perform this command"); return false;}
        return true;
    }
	//Ignores the message if sent from a bot
	if(message.author.bot || message.channel.type === "dm" ) return;

    if (message.content.startsWith(prefix)){
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift();

        switch(command){
            case("radio"):
                if(isInVoice) functions.commandRadio(message.member.voice.channel, args);
                break;
            case("list"):
                //functions.commandList();
            case("countries"):
                functions.commandCountries();
            default: (message.channel.send("Invalid command"))
        }
    }
});

client.login(token);