var content_script_function = (function(config, updateInfo, inject_pages) {
    // this is the content script that gets executed on every page.
    // we will call .toString() on this, so it cannot use any closure variables.

    if (window.persistent_state) {
        // this content script was already executed on this page.

        // background page was re-initialized and called tabs.query. cases:
        // - background page was woken up (BGPID changes)
        //   - hidden div still exists
        // - or app was updated
        //   - hidden div lost its event listener? (TODO: check)
        // - simple onUpdate call
        //   - do nothing
        
        if (config.installid != persistent_state.installid) {
            // installid should be completely persistent! (stored in
            // localStorage. If it changes, it means the user has
            // uninstalled the app or mucked with localStorage.

            // possibly cleared their browsing data (not likely)
            
            console.warn("installid changed. did user re-install the extension")

        } else if (config.BGPID != persistent_state.BGPID) {
            // most frequent type of update
            // DO NOTHING!
        } else {
            // nothing has changed really...
        }

        if (! bgconn.connected) {
            // if we lost connection to the background page, re-initialize it
            bgconn.connect()
        }

    } else {

        function BackgroundConnection() {
            this.port = null
            this.connected = false
        }
        BackgroundConnection.prototype = {
            connect: function() {
                console.assert(! this.connected )
                this.port = chrome.runtime.connect({name: window.location.host + ".content_script"})
                this.connected = true;
                this.port.onDisconnect.addListener( this.on_disconnect.bind(this) )
                this.port.onMessage.addListener( this.on_message.bind(this) )
            },
            on_message: function(msg) {
                console.log('content script receives message from background page',msg)

                if (msg.cc && msg.cc == window.location.hostname) {
                    console.log('message had cc, forwarding to web page',msg)
                    custom_dom_event(msg, 'content_script')
                }
            },
            on_web_page_message: function(data) {
                // message from actual web page context
                // Send data back to background event page
                console.log('on_web_page_message',data)
                if (this.port) {
                    this.port.postMessage(data)
                } else {
                    console.warn('unable to forward message to background, no port')
                }
            },
            on_disconnect: function(evt) {
                this.connected = false
                this.port = null
            }
        }


        on_first_run()
    }



    function on_first_run() {
        // FIRST RUN!

        // these two variables will never change for the life of this content script
        window.persistent_state = {origin:window.location.origin,
                                    href:window.location.href };
        window.bgconn = new BackgroundConnection;
        bgconn.connect()

        // the background event page "process" id (which changes when
        // the background page has to reload
        window.persistent_state.BGPID = config.BGPID;
        window.persistent_state.installid = config.installid;

        // setup the hidden communication div
        initialize_communication_div( function() {
            console.log('web page communication div initialization complete')
        })

        var injected = inject_all_to_webpage()
        if (! injected) {
            console.log('unable to inject, no head or body')
            document.onreadystatechange = function(evt) {
                console.log("document onreadystate change, trying to inject now...",evt)
                if (! persistent_state.web_page_injected) {
                    var result = inject_all_to_webpage()
                    console.log('still not ready for injection')

                }
            }

        }
    }

    function inject_all_to_webpage() {
        var injectTo = document.head || document.body
        if (! injectTo) { return false; }
        persistent_state.web_page_injected = {BGPID: config.BGPID,
                                              time: new Date,
                                              injectedTo: (injectTo == document.head ? 'head' : 'body'),
                                              installid: config.installid,
                                              version: config.version}
        console.log("%cinject_all", 'color:#880')
        var data = {config: config, updateInfo: updateInfo};
        var inlinecode = 
            'console.log("web page injection script running");\n' + 
            '(' + inject_pages.spotify.toString() + ')('+JSON.stringify(data)+');'
        var s = document.createElement("script");
        s.textContent = inlinecode;
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head || document.body).appendChild(s);
        return true;
    }

    function custom_dom_event(msg, source) {
        msg.source = source
        var evt = new CustomEvent(config.hidden_div_event_name, {detail:msg});
        evt.initEvent(config.hidden_div_event_name, false, false);
        var d = document.getElementById(config.hidden_div_id);
        d.dispatchEvent(evt)
    }

    function initialize_communication_div(callback) {
        if (document.body && document.readyState == 'complete') {
            on_dom_ready()
            callback()
        } else {
            document.addEventListener("DOMContentLoaded", function() {
                on_dom_ready()
                callback()
            })
        }
    }

    function on_receive_message_from_web_page(msg) {
        var data = msg.detail
        if (data.source == 'content_script') {
            // ignore
        } else {
            bgconn.on_web_page_message(data)
        }
    }

    function on_dom_ready() {
        console.assert(! persistent_state.hidden_div_exists)
        create_hidden_div().addEventListener(config.hidden_div_event_name, on_receive_message_from_web_page)
        persistent_state.hidden_div_exists = true;
    }

    function create_hidden_div() {
        d = document.createElement('div')
        d.id = config.hidden_div_id
        d.style.display = 'none'
        document.body.appendChild(d)
        return d
    }

    return persistent_state; // returns this value to
            // executeScript caller, so they
            // know what state the tab is in.
})