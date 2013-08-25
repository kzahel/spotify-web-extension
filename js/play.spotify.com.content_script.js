if (! window.updateInfo) {
    // this is a manifest content script "match" update. 
    // :-)
    debugger; // not doing it this way
    console.log("%cCONTENT-MATCH INJECTING CONTENT SCRIPT!", 
                (will_inject_webpage() ? "background:#FF0; color:#000" : "background:#FFC; color:#AAA"))

} else {
    console.log("%cINJECTED CONTENT SCRIPT!", 
                (will_inject_webpage() ? "background:#FF0; color:#000" : "background:#FFC; color:#AAA"), 
                window.location.href, 
                updateInfo, 
                window._already_executed, 
                {div_exist:hidden_div_exists()}
               ); // updateInfo passed in from chrome.tabs.onUpdate

}

function will_inject_webpage() {
    if (window._already_executed) { return false }
    if (hidden_div_exists()) { return false }
    return true
    // if the hidden div already exists, this means the app has been reloaded or upgraded.
}

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

function inject_all(updateInfo) {
    if (updateInfo.background_init) {
        // do not expect that window.Spotify exists
    }
    config.updateInfo = updateInfo;
    console.log("%cinject_all", 'color:#880')
    var inlinecode = 
        'window.'+config.injected_config_varname + ' = ' + JSON.stringify(config) + '; \n' + 
        'if ('+config.injected_config_varname+'.updateInfo.background_init) { console.assert(!window.Spotify,"window.Spotify already defined") };\n' + 
        'console.log("injected config");\n' + 
        'console.log("main injection script running");\n\n' + 
        '(' + inject_function.toString() + ')();'
    var s = document.createElement("script");
    s.textContent = inlinecode;
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.head.appendChild(s);
}

function inject_config() {
    var inlinecode = 'window.'+config.injected_config_varname + ' = ' + JSON.stringify(config) + '; \nconsole.log("injected config");\n'
    var s = document.createElement("script");
    s.textContent = inlinecode;
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.head.appendChild(s);
}

function inject_script() {
    var inlinecode = 'console.log("main injection script running");\n\n' + '(' + inject_function.toString() + ')();\nconsole.assert(!window.Spotify,"window.Spotify already defined");';
    var s = document.createElement("script");
    s.textContent = inlinecode;
    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.head.appendChild(s);
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
        console.log('attempt setup new background port')
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



    if (document.body && document.readyState == 'complete') {
        get_hidden_div().addEventListener(config.hidden_div_event_name, on_receive_message_from_web_page)
    } else {
        document.addEventListener("DOMContentLoaded", function() {
            get_hidden_div().addEventListener(config.hidden_div_event_name, on_receive_message_from_web_page)
        })
    }
    window.port = {port:setup_background_port(), connected:true}

    // we want to fuck with the main page context before their scripts get executed...

    // what is content script lifetime?
    
    inject_all(updateInfo);

    //inject_config();
    //inject_script();
    window._already_executed = [config.pagename+'.content_script.js', window.location.origin, BGPID]
}
