function ignoremessage(type, evt) {
    // NOISY shitty messages that we want to ignore
    if (evt.data == '{"type": "execute_deferreds"}') {
        return true;
    }
}

function forward_window_events(type, win) {
    // type is "root" or "frameX", or TBD:"external"?
    win.addEventListener('message', function(evt) {

        if (ignoremessage(type, evt)) {
            return
        }

        var sendup = {
            type: type,
            data: evt.data,
            origin: evt.origin
        };

        port.postMessage({message: {info:"proxied/filtered from browser page", jsorigin:window.location.href, msgevt: sendup}})
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

if (window._already_executed) {
    var msg = ['already executed a content script from', _already_executed]
    console.log(msg);
    msg;
} else {

    console.log(config.pagename, 'content script injected', window.location.origin);

    chrome.runtime.onMessage.addListener(messageRecv);
    function messageRecv(msg) {
        console.log('content script received message from chrome.runtime',msg);
    }

    var port = chrome.runtime.connect({name: config.pagename+".content_script"});

    port.postMessage({message: "content_script_loaded"});
    port.onMessage.addListener(function(msg) {
        console.log('content script received message on port',msg);
    });

    var s = document.createElement("script");

    inject_config();

    s.src = chrome.extension.getURL("js/"+config.pagename+".inject.js");
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(s);


    forward_window_events('root',window)

    var frame = null;
    for (var i=0; i<window.frames.length; i++) {

        frame = window.frames[i];
        if (frame.location.origin == window.location.origin) {
            forward_window_events('frame'+i, frame);
        }

        // DOM wont let us do this
        // forward_window_events('external', window.frames[i]);
    }

    window._already_executed = [config.pagename+'.content_script.js', window.location.origin]
}
