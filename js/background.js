console.log('background page loaded')


chrome.runtime.onInstalled.addListener( function(install_data) {
    // reload the current spotify page so that the content script can run

    if (install_data.reason == "install" ||
        install_data.reason == "update" ) {     //"install", "update", or "chrome_update"


        // doing this each time the background page loads, programmatically
/*
        chrome.tabs.query( { url: "*://play.spotify.com/*" }, function(tabs) {
            console.log('found play tab',tabs)
            tabs.forEach( function(tab) {
                chrome.tabs.reload(tab.id)
            });
        });
*/
    }

});


function PortConnections() {
    this._connections = {}
    this._connected = 0;
}


PortConnections.prototype = {
    handle_connection: function(port) {
        if (port.sender && port.sender.id == config.extension_id) {

            console.assert(port.name);
            console.log('received chrome extension message from', port.name, port.portId_);

            port.onMessage.addListener( function(evt) {
                console.log(port,'received msg',evt);
            } )

            port.onDisconnect.addListener( this.handle_disconnect.bind(this) )

            port.postMessage( { message: "background page received your connection. Thanks :-)", data: new Uint8Array([1,2,3,4]) } )

            console.assert( ! this._connections[port.name] )

            this._connections[port.name] = port
            this._connected++;
            // type, windowid "tab", "infobar", "notification", or "popup"
            var views = chrome.extension.getViews()
            console.log('new port added, views now', views);
        } else {
            console.log('unrecognized chrome extension message',port);
            port.disconnect()
        }
    },
    handle_disconnect: function(port) {
        console.log('disconnected', port);
        console.assert(this._connections[port.name])
        delete this._connections[port.name]
        this._connected--;
    },
    get: function(type) {
        if (type == 'content_script') {
            return this._connections[config.pagename + '.content_script']
        } else if (type == 'popup') {
            return this._connections['popup']
        } else {
            console.assert(false);
        }
    }
}


var ports = new PortConnections;


chrome.runtime.onConnect.addListener( ports.handle_connection.bind(ports) )


chrome.permissions.getAll( function(a) {
    console.log("permissions",a);
});


// on background page load, do this stuff...

chrome.tabs.query( { url: "*://play.spotify.com/*" }, function(tabs) {
    console.log('found play tabs',tabs)
    tabs.forEach( function(tab) {
        // first put in common.js ?
        chrome.tabs.executeScript( tab.id,  { file: 'js/common.js' }, function(results) {
            console.log('common injection results', results)

            chrome.tabs.executeScript( tab.id,  { file: 'js/play.spotify.com.content_script.js' }, function(results2) {
                console.log('injection results', results2)
            } )

        } )
    });
});

