const Discord = require('discord.js');
const functions = require("./functions.js")
const client = new Discord.Client({
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

        client.user.setPresence({
            activity: {
                name: "commands in " + channel.name,
                //type: "LISTENING"
            }
        })
    })
    .catch(error => console.log(error + "\tSomething went wrong"));
});

client.on('message', async message => {
    const isInVoice = () => {
        //Checks if the member is in a voice channel
        if(message.member?.voice?.channel !== null){
            //Checks if the bot is in a voice channel
            if(message?.guild?.voice?.channelID === undefined)
                return true;
            else
                //Checks if the member is in the same voice channel as the bot
                 if (message.member?.voice?.channel.id === message?.guild?.voice?.channelID)
                    return true;
                else
                    {message.channel.send("You must be in the same channel as the bot to perform this command"); return false;}
        }else{
            message.channel.send("You need to be in a voice channel in order to perform this command"); return false;
        }
    }

	//Ignores the message if sent from a bot
	if(message.author.bot || message.channel.type === "dm" ) return;

    if (message.content.startsWith(prefix)){
        if(message.channel.id !== logchannel)
            return message.channel.send("Commands will only work in " + message.guild.channels.cache.get(logchannel));
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift();

        switch(command){
            case("auto"):
                functions.commandAuto();
                break;
            case("radio"):
                if(isInVoice()) functions.commandRadio(message.member.voice.channel, args);
                break;
            case("list"):
                //functions.commandList();
                break;
            case("stop"):
                if(isInVoice()) functions.commandStop();
                break;
            default: (message.channel.send("Invalid command"))
        }
    }
});

client.login(token);