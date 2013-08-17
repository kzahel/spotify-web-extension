function ignoremessage(evt) {
    if (evt.data == '{"type": "execute_deferreds"}') {
        return true;
    }
}

if (window._already_executed) {
    var msg = ['already executed a content script from', _already_executed]
    console.log(msg);
    msg;
} else {

    console.log('play.spotify.com content script injected', window.location.origin);


    chrome.runtime.onMessage.addListener(messageRecv);
    function messageRecv(msg) {
        console.log('content script received message from chrome.runtime',msg);
    }


    var port = chrome.runtime.connect({name: "play.spotify.com.content_script"});

    port.postMessage({message: "content_script_loaded"});
    port.onMessage.addListener(function(msg) {
        console.log('content script received message on port',msg);
    });

    var s = document.createElement("script");
    s.src = chrome.extension.getURL("js/play.spotify.com.inject.js");
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(s);

    window.addEventListener('message', function(evt) {


        if (ignoremessage(evt)) {
            return
        }

        var sendup = {
            data: evt.data,
            origin: evt.origin
        };

        port.postMessage({message: {info:"proxied/filtered from browser page", jsorigin:window.location.href, msgevt: sendup}})
    });

    window._already_executed = ['play.content_script.js', window.location.origin]
}
