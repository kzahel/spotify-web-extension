if (window._already_executed) {
    var msg = ['already executed a content script from ', _already_executed]
    console.log(msg);
    msg;
} else if (window.location.hostname == config.pagename) {
    var msg = 'dont execute all.content_script, this is ' + config.pagename
    console.log(msg);
    msg;
} else {

    console.log('all.content_script injected', window.location.origin);


    document.body.addEventListener('click', function(evt) {
        if (evt.target.tagName == 'A') {
            if (evt.target.href.match('^spotify:')) {
                console.log('you clicked on a spotify link yahhh')
                if (! config.use_desktop_spotify) {
                    evt.preventDefault(); // dont open with spotify desktop
                }
            }
        }

    });

    window._already_executed = ['all.content_script.js', window.location.origin]
}