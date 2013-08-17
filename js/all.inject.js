var config = _____________config;


// ONLY NEED DOM ACCESS!!!
if (false && ! config.use_desktop_spotify) {

    function fuck_anchor(tag) {
        tag.href = 'web+spotify://FUCKYOUMOTHERFUCKER' + tag.href
    }

    var links = document.querySelectorAll('a[href^="spotify:"]');

    for (var i=0; i<links.length; i++) {
        console.log('fucked spotify anchor');
        fuck_anchor(links[i])
    }

    document.body.addEventListener('click', function(evt) {
        debugger;
        evt.preventDefault(); // dont open with spotify desktop
    });

    var msg = { untrusted: true,
                event: 'injection',
                who_is_responsible_for_this: "chrome extension",
                extension_id: config.extension_id }

    var target_origin = 'chrome-extension://' + config.extension_id+"FUCKR";

    window.postMessage( JSON.stringify(msg) , target_origin );
}