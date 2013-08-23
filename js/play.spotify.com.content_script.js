console.log("%cINJECTED CONTENT SCRIPT!", (window._already_executed ? "background:#FFC; color:#AAA" : "background:#FF0; color:#000"), window.location.href, updateInfo, window._already_executed); // updateInfo passed in from chrome.tabs.onUpdate

function on_receive_message_from_web_page(msg) {
    var data = msg.detail
    if (data.source == 'content_script') {
        // ignore
    } else {
        try_port_postMessage(data)
    }
}

function ignoremessage(type, evt) {
    // NOISY shitty messages that we want to ignore (specific for
    // play.spotify.com cross-iframe postMessage communication
    return true; // simply ignore all postMessages created from the page
    if (evt.data == '{"type": "execute_deferreds"}') {
        return true;
    }
}

function try_port_postMessage(data) {
    // Send data back to background event page
    if (window.port) {
        port.port.postMessage(data)
    } else {
        console.log('unable to forward message to background, no port')
    }
}

function handle_window_events(type, win) {
    return // DONT use this anymore. unless wanting actual window events. too noisy.
    // type is "root" or "frameX", or TBD:"external"?
    win.addEventListener('message', function(evt) {

        console.log('content_script:handle window messages')

        var data = evt.data;
        if (data.length !== undefined) {
            data = data[0] // hack because main page throws annoying exception if we send an object
        }

        if (data.cc && data.requestid && data.payload) {
            // API message, don't forward back up to background page
            // because that's where it came from! ignore.

        } else if (data.extension_id &&
                   data.injected_script == config.pagename + '.inject.s' &&
                   data.message && data.message.payload && data.message.requestid) {
            try_port_postMessage(data);

        } else {
            // simple forwarding of messages back up to root frame
            if (ignoremessage(type, evt)) {
                return
            }
            var sendup = {
                type: type,
                data: data,
                origin: evt.origin
            };
            try_port_postMessage({message: {info:"proxied/filtered from browser page", jsorigin:window.location.href, msgevt: sendup}})
        }
    });
}

function inject_config() {
    var inlinecode = config.injected_config_varname + ' = ' + JSON.stringify(config);
    var s = document.createElement("script");
    s.textContent = inlinecode;
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(s);
}



function setup_background_port() {
    var port = chrome.runtime.connect({name: config.pagename+".content_script"});
    console.log("%cPort connected!","background: #2B2; color: #00000")
    port.onDisconnect.addListener(function(evt) {
        window.port.connected = false;
        console.log("%cPort disconnected!","background: #B22; color: #00000")
        // how does this happen, what does it mean? should we try to reconnect?

        // will this work?

        // set delayed timeout, and set lock
        window.port = {port:setup_background_port(), connected:true}
    })
    //port.postMessage({message: "content_script_loaded"});
    port.onMessage.addListener(function(msg) {

        console.log('content script received message from background page',msg);

        if (msg.cc && msg.cc == window.location.hostname) {
            console.log('message had cc, forwarding to web page',msg)
            // window.postMessage([msg], window.location.origin)
            custom_dom_event(msg, 'content_script')

        }
    });
    return port
}

console.assert( BGPID );
console.assert( config );

if (window.parent !== window) {
    window._already_executed = [config.pagename+'.content_script.js', window.location.origin, BGPID]
    var msg = ['not root frame', _already_executed];
    msg;
} else if (window._already_executed) {
    var lastBGPID = _already_executed[2]
    var msg = ['already executed a content script from', _already_executed]
    msg;
} else {
    get_hidden_div().addEventListener(config.hidden_div_event_name, on_receive_message_from_web_page)
    window.port = {port:setup_background_port(), connected:true}
    var s = document.createElement("script");
    inject_config();
    s.src = chrome.extension.getURL("js/"+config.pagename+".inject.js");
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(s);

    handle_window_events('root',window)

    window._already_executed = [config.pagename+'.content_script.js', window.location.origin, BGPID]
}
