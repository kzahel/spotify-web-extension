function will_inject_webpage() {
    if (window._already_executed) { return false }
    if (hidden_div_exists()) { return false }
    return true
    // if the hidden div already exists, this means the app has been reloaded or upgraded.
}

console.log("%cINJECTED CONTENT SCRIPT!", (will_inject_webpage() ? "background:#FF0; color:#000" : "background:#FFC; color:#AAA"), window.location.href, updateInfo, window._already_executed, {div_exist:hidden_div_exists()}); // updateInfo passed in from chrome.tabs.onUpdate

function on_receive_message_from_web_page(msg) {
    var data = msg.detail
    if (data.source == 'content_script') {
        // ignore
    } else {
        try_port_postMessage(data)
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
} else if (hidden_div_exists()) {
    // try to setup port... cant hurt!
    get_hidden_div().addEventListener(config.hidden_div_event_name, on_receive_message_from_web_page)
    window.port = {port:setup_background_port(), connected:true}
    window._already_executed = [config.pagename+'.content_script.js', window.location.origin, BGPID, 'hidden div existed']
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

    window._already_executed = [config.pagename+'.content_script.js', window.location.origin, BGPID]
}
