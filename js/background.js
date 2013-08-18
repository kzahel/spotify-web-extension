var BGPID = Math.floor(Math.random() * Math.pow(2,31))

console.assert( chrome.app.getDetails().id == config.extension_id )

console.log('background page loaded with BGPID',BGPID)
console.log("%cFUN COLORED CONSOLE LOG!","background: #2B2; color: #00000")

var logconfig = {
    injected: true,
    other: false
}

chrome.runtime.onInstalled.addListener( function(install_data) {
    // reload the current spotify page so that the content script can run

    console.log('chrome runtime onInstalled',install_data, 'running version:', chrome.app.getDetails().version)
    
    if (install_data.reason == "install" ||
        install_data.reason == "update" ) {     //"install", "update", or "chrome_update"
    }
});

window.spwebconn_id = 0;

function SpotifyWebConnection(port, manager) {
    this._id = window.spwebconn_id++;
    this.port = port;
    this.manager = manager;
    port.onMessage.addListener( this.handle_message.bind(this) )
    port.onDisconnect.addListener( manager.handle_disconnect.bind(manager) )
    this.send_to_content( { BGPID:BGPID, message: "background page received your connection. Thanks :-)", data: new Uint8Array([1,2,3,4]) } )
}

SpotifyWebConnection.prototype = {
    handle_message: function(msg) {
        if (msg.message && msg.message.msgevt) {
            var data = msg.message.msgevt.data
            if (typeof data == "string") {
                // comes from content script postMessage, try to JSON parse and shit
                try {
                    data = JSON.parse(data)
                } catch(e) { }
                //console.log('handle message','SpotifyWebConnection'+this._id, msg.message.msgevt.type, data);
            } else {

                console.log('DATA!',data);
/*
                if (data.sender == "extension" && 
                    data.injected_script == config.pagename + '.inject.js' &&
                    data.extension_id == config.extension_id) {
                    console.log('received message from main page javascript context',msgverbose);
                }
*/
            }
        } else {
            //console.log('handle message','SpotifyWebConnection'+this._id, msg);
        }
    },
    send_to_content: function(msg) {
        this.port.postMessage( msg )
    }
}

function PortConnections() {
    this._tab_connections = {}
    this._connected = 0;
    this._play_tabs = {};
    this._active_play_tab = null;
}


PortConnections.prototype = {
    handle_connection: function(port) {
        if (port.sender && port.sender.id == chrome.app.getDetails().id) {

            var tabId = port.tabId_ || port.sender.tab.id;

            console.assert( tabId );

            console.assert(port.name);
            console.log('received chrome port connection from', port.name, port.portId_);

            var spwebconn = new SpotifyWebConnection(port, this);

            console.assert( ! this._tab_connections[tabId] )

            this._tab_connections[tabId] = spwebconn
            this._connected++;
            console.assert( Object.keys(this._tab_connections).length == this._connected );

            if (port.name == config.pagename + '.content_script') {
                this._play_tabs[ tabId ] = spwebconn

                if (! this._active_play_tab) {
                    this._active_play_tab = spwebconn
                }
            }
            console.log('new port added total connections now', this._connected);
        } else {
            console.log('unrecognized chrome extension message',port);
            port.disconnect()
        }
    },
    handle_disconnect: function(port) {
        console.log('disconnected', port);
        var tabId = port.sender.tab.id

        console.assert( tabId )

        if (port.name == config.pagename + '.content_script') {
            console.assert( this._tab_connections[tabId] )
            delete this._play_tabs[tabId]
            if (Object.keys( this._play_tabs ).length == 0) {
                this._active_play_tab = null;
            }
        }
        console.assert(this._tab_connections[tabId])
        delete this._tab_connections[tabId]
        this._connected--;
    },
    get: function(type) {
        if (type == 'content_script') {
            return this._active_play_tab;
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


// INJECT into our content script
chrome.tabs.query( { url: "*://"+config.pagename+"/*" }, function(tabs) {
    console.log('background page loaded: found play tabs',tabs, 'of length',tabs.length)
    tabs.forEach( function(tab) {
        // first put in common.js ?

        chrome.tabs.executeScript( tab.id, { code: "var BGPID = " + BGPID + ";BGPID;" }, function(results0) {

            chrome.tabs.executeScript( tab.id,  { file: 'js/common.js' }, function(results) {

                chrome.tabs.executeScript( tab.id,  { file: 'js/'+config.pagename+'.content_script.js' }, function(results2) {
                    console.log('injection results tabid', tab.id, results0, results, results2)
                } )

            } )
        })
    });
});

chrome.tabs.onUpdated.addListener( function(tabId, changeInfo, tab) {
    //console.log('tab change',tabId,changeInfo.status,changeInfo.url);
    //console.log('tab is',tab)
    chrome.tabs.executeScript( tab.id, { file: 'js/all.content_script.js' }, function(results) {
        console.log('tab executed script', tab.id, 'all.content_script', results)
    });
    
})

/*

TODO: handle injecting content scripts once we gain all tabs.

use chrome.tabs permission somehow?
can use: chrome.tabs.onUpdated to see URL navigation changes :-)

http://stackoverflow.com/questions/16399093/moving-from-permissions-to-optional-permissions-how-to-handle-content-scripts/18293326#18293326
*/