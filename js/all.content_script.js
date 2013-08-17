console.log('all.content_script.js injected');

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
