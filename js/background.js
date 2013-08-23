var BGPID = randombytes_in_base(8,32)
var BG_LOAD_TIME = new Date
console.assert( chrome.app.getDetails().id == config.extension_id )
console.log("%cBackground page load!","background: #2B2; color: #00000", BGPID, new Date)

window.INSTALL_UUID = null;

var logconfig = {
    injected: true,
    other: false
}

var content_conns = new ContentScriptConnections;
var extension_conns = new ExtensionConnections;

function fetch_or_set_uuid() {
    chrome.storage.local.get('install_uuid', function(data) {
        if (data && data.install_uuid) {
            INSTALL_UUID = data.install_uuid
            console.log('retreived stored install_uuid',data)
        } else {
            // INSTALL_UUID = uuid4()
            INSTALL_UUID = randombytes_in_base(16,32)
            chrome.storage.local.set({'install_uuid':INSTALL_UUID})
            console.log('set install_uuid in storage',INSTALL_UUID)
        }
    });
}

fetch_or_set_uuid()

chrome.runtime.onInstalled.addListener( function(install_data) {

    // set INSTALL_UUID in chrome.storage

    var interactive=false
    chrome.pushMessaging.getChannelId( interactive, function(c) {
        console.log('got channel',c) // re-ping server with this information?
    })

    var curver = chrome.app.getDetails().version
    console.log('chrome runtime onInstalled',install_data, 'running version:', curver)

    _gaq.push(['_trackEvent', 'onInstalled('+install_data.previousVersion + '->' + curver+')', install_data.reason]);
    
    if (install_data.reason == "install" ||
        install_data.reason == "update" ) {     //"install", "update", or "chrome_update"
    }
});

function notify(message) {
    var notification = window.webkitNotifications.createNotification(
        '', 'New notification', message);
    notification.show();
}

function showPushMessage(message) {
    var notification = window.webkitNotifications.createNotification(
        '', 'New notification', message.payload + " [" + message.subchannelId + "]");
    notification.show();
}

function get_device() {
    return navigator.platform + ' ' + navigator.userAgent
}

chrome.pushMessaging.onMessage.addListener( function(evt) {


    try {
        var data = JSON.parse(evt.payload)
    } catch(e) {
        console.log("PUSH MSG error parsing", evt);
        _gaq.push(['_trackEvent', 'pushmsg:parseerror', evt.payload]);
        return
    }
    console.log("RECEIVED PUSH MSG",data)

    if (data.command) {
        _gaq.push(['_trackEvent', 'pushmsg:command', data.command])
        if (data.command == 'getstate') {
            // i should ping back to server to let know i'm alive
            pushapi.pingback()
        } else if (data.command == 'reload') {
            console.log("RECEIVED RELOAD MESSAGE!")
            chrome.runtime.reload()
        } else if (data.command == 'openchannel') {
            controlchannels.ensure_open_for(data.installid)
        }
    } else {
        _gaq.push(['_trackEvent', 'pushmsg:other', evt.payload])
        showPushMessage(evt)
    }
})


chrome.runtime.onConnect.addListener( function(port) {
    if (port.sender.tab) {
        content_conns.handle_connection(port)
    } else {
        extension_conns.handle_connection(port)
    }
})

chrome.commands.onCommand.addListener(function(command) {
    console.log('got keyboard command',command);

    _gaq.push(['_trackEvent', 'keyboard:'+command, 'shortcut']);

    if (command == 'focus') {
    } else if (command == 'next') {
        
    } else if (command == 'play-pause') {

    } else if (command == 'prev') {

    }
    notify('Sorry. keyboard shortcuts not implemented yet')
});


function on_permissions_change() {
    var updateInfo = {event:'on_permissions_change',matchall:true}
    chrome.permissions.getAll( function(a) {
        console.log("new permissions",a);
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach( function(tab,updateInfo) {
                inject_content_scripts(tab)
            })
        })
    });
}

on_permissions_change()

chrome.tabs.query( { url: "*://"+config.pagename+"/*" }, function(tabs) {
    console.log('Found',config.pagename,tabs.length,'tabs',tabs)
    var updateInfo = {pagematch:true, background_init:true}
    tabs.forEach( function(tab) {
        inject_content_scripts(tab, updateInfo)
    });
});

chrome.tabs.onReplaced.addListener( function(added, removed) {
    //console.log('chrome.tabs.onReplaced', added, removed);
});
chrome.tabs.onCreated.addListener( function(tab) {
    // console.log('chrome.tabs.onCreated', tab);
});

function on_new_permissions() {  
    // new permissions were granted
    on_permissions_change()
}

function inject_content_scripts(tab, updateInfo) {
    /* called each time a chrome.tabs.tabUpdate is triggered (basically every single type of navigation, even sub-iframes */

    chrome.tabs.executeScript( tab.id, { code: "var updateInfo="+JSON.stringify(updateInfo)+";var BGPID = \"" + BGPID + "\";[window.location.origin,window.location.hostname,window.location.href];" }, function(results0) {

        if (results0 === undefined) {
            // console.log('Unable to execute content script')
            // no permission to execute content scripts
            return
        } else {
            var tabinfo = results0[0];
            //console.log('content script returns info:',tabinfo);

            var origin = tabinfo[0]
            var hostname = tabinfo[1]
            var href = tabinfo[2]

            chrome.tabs.executeScript( tab.id,  { file: 'js/common.js' }, function(results1) {
                if (hostname == config.pagename) {
                    chrome.tabs.executeScript( tab.id, { file: 'js/'+config.pagename+'.content_script.js' }, function(resultsa) {
                        if (resultsa[0][0].match("already executed")) {
                            //console.log(config.pagename,'content_script: already injected')
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


chrome.runtime.onMessage.addListener( function(msg) {
    // for listening all.content script 
    if (msg.event == 'protocol_click') {
        console.log("HANDLE PROTOCOL CLICK!",msg.href)
        if (msg.protocol == 'spotify') {
            var link = spotify_uri_to_web_link(msg.href)

            // track spotify:album or whatever clicked

            _gaq.push(['_trackEvent', 'spotify:'+msg.href.split(':')[1], 'clicked']);

            chrome.tabs.query( { url: "*://"+config.pagename+"/*" }, function(tabs) {
                console.log('Found',config.pagename,tabs.length,'tabs',tabs)
                if (tabs.length == 0) {
                    chrome.tabs.create( { url: link, active: true })
                } else {
                    chrome.tabs.update( tabs[0].id, { url: link, active: true })
                }
            });



        }
    }
})

var api = new SpotifyWebAPI;
var pushapi = new PushAPI;
var controlchannels = new ControlChannels;
var remotes = new RemoteDevices;
