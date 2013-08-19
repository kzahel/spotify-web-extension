if (window._already_executed) {
    var msg = ['already executed a content script from ', _already_executed]
    console.log(msg);
    msg;
} else if (window.location.hostname == config.pagename) {
    var msg = ['dont execute all.content_script, this is ' + config.pagename]
    console.log(msg);
    msg;
} else {
    window.bg = null;
    function get_background(cb) {
        if (window.bg) { 
            if (cb) { cb() }
        } else {
            chrome.runtime.getBackgroundPage( function(bgpage) {
                bg = bgpage;
                console.log('got background page',bg);
                if (cb) { cb() }
            })
        }
    }
    //get_background();

    console.log('all.content_script injected', window.location.origin);

    document.body.addEventListener('click', function(evt) {

        var foundNode = null

        var trynodes = [evt.target, evt.target.parentNode]
        
        for (var i=0; i<trynodes.length; i++) {
            if (trynodes[i] && trynodes[i].tagName.toUpperCase() == 'A') {
                foundNode = trynodes[i]
                break;
            }
        }
        if (foundNode) {
            if (foundNode.href && foundNode.href.match('^spotify:')) {
                console.log('you clicked on a spotify link yahhh')
                if (! config.use_desktop_spotify) {
                    evt.preventDefault(); // dont open with spotify desktop
                    var msg = {event:'protocol_click',
                               protocol:'spotify',
                               href:foundNode.href}
                    console.log('chrome.runtime.sendMessage',msg)
                    chrome.runtime.sendMessage(msg)
                }
            } else if (foundNode.href.match('^magnet:')) {
                console.log('you clicked on a magnet link yahhh')
                // TODO: is background page dead? send ALARM
                chrome.runtime.sendMessage({event:'protocol_click',
                                            protocol:'magnet',
                                            href:foundNode.href})
            }
        }


    });

    window._already_executed = ['all.content_script.js', window.location.origin]
}