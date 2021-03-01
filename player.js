module.exports = function(voice, stream, url, clientLogMessage){
    if(stream === undefined)
        voice.join().then(connection => {
            stream = connection;
            
            connection.on("debug", e => {
                if (e.includes('[WS] >>') || e.includes('[WS] <<')) return;
                clientLogMessage("Status: Connection warning - " + e);
                if(e.includes('[WS] closed')) abortWithError();
            });
            connection.on("disconnect", () => {
                //clientLogMessage("Status: Connection disconnect");
                //console.log("disconnected")
                abortWithError();
                connection.destroy();
            });
            connection.on("error", e => {
                clientLogMessage("Status: Error. See logs");
                console.log(e);
                abortWithError();
            });
            connection.on("finish", () => {
                console.log("Left the voice channel")
            });
            initDispatcher(connection, url, clientLogMessage);
        }).catch(e => {
            console.log(e);
        });
    else
        initDispatcher(stream, url, clientLogMessage);
}        

function initDispatcher(connection, url, clientLogMessage) {

    streamDispatcher = connection.play(url, {
        volume: false,
        highWaterMark: 512,
        bitrate: 128,
        fec: true
    })

    streamDispatcher.setBitrate(128);
    streamDispatcher.setFEC(true);

    streamDispatcher.on("finish", () => {
            clientLogMessage("Status: Broadcast either finished or doesn't exist");
            connection.destroy();
            //initDispatcher(connection, url);
        });	


    streamDispatcher.on("debug", e => {
        clientLogMessage("Status: Dispatcher warning - " + e);
    });

    streamDispatcher.on("disconnect", () => {
        clientLogMessage("Status: Connection disconnect");
        streamDispatcher.destroy();
    });

    streamDispatcher.on("error", e => {
        clientLogMessage("Status: Broadcast connection error");
        console.log(e);
        streamDispatcher.destroy();
    });
}

function abortWithError() {
    connection.destroy()
    if (stream.dispatcher !== undefined) stream.dispatcher.destroy();
//clientLogMessage("Status: The connection to the radio station is interrupted or it does not respond, interrupting the process");

//process.exit(1);
}