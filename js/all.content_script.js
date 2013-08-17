console.log('all.content_script.js injected');


if (false) { // this is unneccessary. :-) But I won't delete it yet

    // add the configuration

    //var inlinecode = '_____________config = ' + JSON.stringify(config).replace(/"/g, '\\"') + ';' // dont need to be this fancy
    // for convenience, rather than pre-processing, we inject the nice-to-have configuration file dynamically

    var inlinecode = '_____________config = ' + JSON.stringify(config);
    var s = document.createElement("script");
    s.textContent = inlinecode;

    s.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(s);

    var inj = document.createElement("script");
    inj.src = chrome.extension.getURL("js/all.inject.js");
    inj.onload = function() {
        this.parentNode.removeChild(this);
    };
    document.body.appendChild(inj);


    window.addEventListener("message", function(evt) {
        console.log('(expected NOISY) content script gets message',evt);
        if (typeof evt.data == 'string' && evt.origin.match('spotify.com')) {
            var msg = JSON.parse(evt.data)
            if (msg.extension_id == config.extension_id) {
                console.log("RECEIVED MESSAGE FROM our own injected script :-)")
                debugger;
            }
        }

    });

}

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
