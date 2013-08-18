window.port = null;

function ignoremessage(type, evt) {
    // NOISY shitty messages that we want to ignore (specific for
    // play.spotify.com cross-iframe postMessage communication
    if (evt.data == '{"type": "execute_deferreds"}') {
        return true;
    }
}

function try_port_postMessage(data) {
    if (window.port) {
        port.postMessage(data)
    } else {
        console.log('unable to forward message to background, no port')
    }
}

function handle_window_events(type, win) {
    // type is "root" or "frameX", or TBD:"external"?
    win.addEventListener('message', function(evt) {

        if (evt.data.cc && evt.data.requestid && evt.data.payload) {
            // API message, don't forward back up to background page
            // because that's where it came from! ignore.

        } else if (evt.data.extension_id &&
                   evt.data.injected_script == config.pagename + '.inject.s' &&
                   evt.data.message && evt.data.message.payload && evt.data.message.requestid) {
            try_port_postMessage(evt.data);

        } else {
            // simple forwarding of messages back up to root frame
            if (ignoremessage(type, evt)) {
                return
            }
            var sendup = {
                type: type,
                data: evt.data,
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
        window.port = null;
        console.log("%cPort disconnected!","background: #B22; color: #00000")
    })
    port.postMessage({message: "content_script_loaded"});
    port.onMessage.addListener(function(msg) {
        console.log('content script received message from background page',msg);

        if (msg.cc && msg.cc == window.location.hostname) {
            // dont need to actually check cc because background page knows this already.

            // actually, does it know that????

            // check this... i am getting tired

            // hopefully doesn't have too many side effects :-)
            // console.log('content script forwarding to web page WARNING MANUAL HTTP:// DEST for POSTMESSAGE')
            window.postMessage(msg, window.location.origin)
        }
    });
    return port
}


console.assert( BGPID ); // INDICATES RACE condition between manifest injection and programmatic injection!!!!!!!
console.assert( config );

if (window._already_executed) {
    var lastBGPID = _already_executed[2]
    var msg = ['already executed a content script from', _already_executed]
    if (lastBGPID != BGPID) {
        msg = ['already executed, however this is new BGPID...']
        console.assert( ! window.port )
        window.port = setup_background_port()
    } else {
        console.log(msg);
        msg;
    }
} else {
    console.log(config.pagename, 'content script injected', window.location.origin);

/*
    chrome.runtime.onMessage.addListener(messageRecv);
    function messageRecv(msg) {
        console.log('content script received message from chrome.runtime',msg);
    }
*/

    window.port = setup_background_port()


    var s = document.createElement("script");

    inject_config();

    s.src = chrome.extension.getURL("js/"+config.pagename+".inject.js");
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(s);

    handle_window_events('root',window)

/*

// this is a bunch of noisy shit that's not very useful for this page.
// but could be nice if you want to look at all the postMessages...

  // frames may not be ready yet. so don't do this.
    var frame = null;
    for (var i=0; i<window.frames.length; i++) {

        frame = window.frames[i];
        if (frame.location.origin == window.location.origin) {
            forward_window_events('frame'+i, frame);
        }

        // DOM wont let us do this
        // forward_window_events('external', window.frames[i]);
    }
*/

    window._already_executed = [config.pagename+'.content_script.js', window.location.origin, BGPID]
}
