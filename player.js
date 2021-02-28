function playStream(channel, url) {	
    if(streamConnection === undefined)
        channel.join().then(connection => {
            streamConnection = connection;
            
            connection.on("debug", e => {
                if (e.includes('[WS] >>') || e.includes('[WS] <<')) return;
                //clientLogMessage("Status: Connection warning - " + e);
                //if(e.includes('[WS] closed')) abortWithError();
            });
            connection.on("disconnect", () => {
                //clientLogMessage("Status: Connection disconnect");
                console.log("disconnected")
                abortWithError();
            });
            connection.on("error", e => {
                clientLogMessage("Status: Error. See logs");
                console.log(e);
                abortWithError();
            });
            connection.on("failed", e => {
                clientLogMessage("Status: Failed to connect to voice channel");
                console.log(e);
                abortWithError();
            });
            connection.on("finish", () => {
                console.log("Left the voice channel")
            });
        initDispatcher(connection, url);
        }).catch(e => {
            console.log(e);
        })
    else
        initDispatcher(streamConnection, url);
}

function initDispatcher(connection, url) {
    if (streamDispatcher !== undefined) streamDispatcher.destroy();

    streamDispatcher = connection.play(url, {
        volume: false,
        highWaterMark: 512,
        bitrate: 128,
        fec: true
    })

    streamDispatcher.on("finish", () => {
            clientLogMessage("Status: Broadcast either finished or doesn't exist");
            abortWithError()
            //initDispatcher(connection, url);
        });	
    streamDispatcher.setBitrate(128);
    streamDispatcher.setFEC(true);

    streamDispatcher.on("debug", e => {
        clientLogMessage("Status: Dispatcher warning - " + e);
    });

    streamDispatcher.on("disconnect", () => {
        //clientLogMessage("Status: Connection disconnect");
        abortWithError();
    });

    streamDispatcher.on("error", e => {
        clientLogMessage("Status: Broadcast connection error");
        console.log(e);
        abortWithError();
    });
}

function abortWithError() {
    streamConnection = undefined;
    if(icyReader !== undefined) icyReader.removeAllListeners();
    if (streamDispatcher !== undefined) streamDispatcher.destroy();
//clientLogMessage("Status: The connection to the radio station is interrupted or it does not respond, interrupting the process");

//process.exit(1);
}

function clientLogMessage(message) {
	client.channels.fetch(logchannel).then(channel => {
		channel.send(message)
	}).catch(e => console.log(e));
}
	