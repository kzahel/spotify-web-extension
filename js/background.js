var BGPID = Math.floor(Math.random() * Math.pow(2,31))
console.assert( chrome.app.getDetails().id == config.extension_id )
console.log("%cBackground page load!","background: #2B2; color: #00000", BGPID)

var logconfig = {
    injected: true,
    other: false
}

var content_conns = new ContentScriptConnections;
var extension_conns = new ExtensionConnections;

chrome.runtime.onInstalled.addListener( function(install_data) {
    console.log('chrome runtime onInstalled',install_data, 'running version:', chrome.app.getDetails().version)
    
    if (install_data.reason == "install" ||
        install_data.reason == "update" ) {     //"install", "update", or "chrome_update"
    }
});

chrome.runtime.onConnect.addListener( function(port) {
    if (port.sender.tab) {
        content_conns.handle_connection(port)
    } else {
        extension_conns.handle_connection(port)
    }
})


chrome.permissions.getAll( function(a) {
    console.log("permissions",a);
});

chrome.tabs.query( { url: "*://"+config.pagename+"/*" }, function(tabs) {
    console.log('Found',config.pagename,tabs.length,'tabs',tabs)
    tabs.forEach( function(tab) {
        inject_content_scripts(tab)
    });
});

chrome.tabs.onReplaced.addListener( function(added, removed) {
    console.log('chrome.tabs.onReplaced', added, removed);
});
chrome.tabs.onCreated.addListener( function(tab) {
    console.log('chrome.tabs.onCreated', tab);
});

function inject_content_scripts(tab, updateInfo) {
    /* called each time a chrome.tabs.tabUpdate is triggered (basically every single type of navigation, even sub-iframes */

    chrome.tabs.executeScript( tab.id, { code: "var updateInfo="+JSON.stringify(updateInfo)+";var BGPID = " + BGPID + ";[window.location.origin,window.location.hostname];" }, function(results0) {

        if (results0 === undefined) {
            console.log('Unable to execute content script')
            // no permission to execute content scripts
            return
        } else {
            var tabinfo = results0[0];
            console.log('content script returns info:',tabinfo);

            var origin = tabinfo[0]
            var hostname = tabinfo[1]

            chrome.tabs.executeScript( tab.id,  { file: 'js/common.js' }, function(results1) {
                if (hostname == config.pagename) {
                    chrome.tabs.executeScript( tab.id, { file: 'js/'+config.pagename+'.content_script.js' }, function(resultsa) {
                        if (resultsa[0][0].match("already executed")) {
                            console.log(config.pagename,'content_script: already injected')
                        } else {
                            console.log(config.pagename,'content_script injected', resultsa);
                        }
                    })
                } else {
                    chrome.tabs.executeScript( tab.id, { file: 'js/all.content_script.js' }, function(resultsb) {
                        console.log('all.content_script injected', resultsb)
                    })
                }
            })
        }
    })
}

chrome.tabs.onUpdated.addListener( function(tabId, changeInfo, tab) {
    var updateInfo = {event:'onUpdated',changeInfo:changeInfo,tabInfo:tab.status}
    // console.log('tab change',tabId,changeInfo.status,changeInfo.url);
    inject_content_scripts(tab, updateInfo)
})


function SpotifyWebAPI() {
    this._requests = {}
    this._requestctr = 1;
    this._timeout_interval = 40000;
    this._playerframenum = 0;
}
SpotifyWebAPI.prototype = {
    get_conn: function() {
        return content_conns.get_active()
    },
    handle_request_timeout: function(requestid) {
        console.log('API request timeout',requestid)
        var callbackinfo = this._requests[requestid]
        delete this._requests[requestid]
        if (callbackinfo.callback) { callbackinfo.callback({timeout:true}) }
    },
    send_to_webpage: function(msg, cb) {
        var requestid = this._requestctr++
        var request_timeout = setTimeout( this.handle_request_timeout.bind(this, requestid), this._timeout_interval );
        this._requests[requestid] = {callback:cb, timeout:request_timeout}
        console.log('requests',this._requests);
        var conn = this.get_conn()
        console.assert( conn )
        conn.send_api_message_to_webpage( requestid, msg )
    },
    handle_webpage_api_response: function(msg) {
        console.log('SpotifyWebAPI handle response!',msg)
        var callbackinfo = this._requests[msg.requestid]
        if (! callbackinfo) {
            console.log('WARNING -- duplicate response received :-(')
            return
        }
        console.assert( callbackinfo ) // response came back after timeout_interval
        clearTimeout( callbackinfo.timeout )
        delete this._requests[msg.requestid]
        var cb = callbackinfo.callback;
        if (cb) {
            cb(msg.payload);
        }
    },
    get_frames: function(cb) {
        this.send_to_webpage( { command: 'getframes' }, cb )
        // set this._playerframenum
    },
    get_playing: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'getplayerstuff' }, cb )
    },
    get_rootlist: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'get_rootlist' }, cb )
    }
}

// nextSong(), playpause(), getSongPlayed(), getArt(), getQueue(), etc
var api = new SpotifyWebAPI;


/*

TODO: handle injecting content scripts once we gain all tabs.

use chrome.tabs permission somehow?
can use: chrome.tabs.onUpdated to see URL navigation changes :-)

http://stackoverflow.com/questions/16399093/moving-from-permissions-to-optional-permissions-how-to-handle-content-scripts/18293326#18293326
*/