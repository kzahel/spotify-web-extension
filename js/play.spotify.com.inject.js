(function() {

    window.addEventListener("message", function(evt) {
        //console.log('injected script saw window messages', evt)
    })

    function try_to_find_good_frame() {
        var goodframe = null;
        for (var i=0; i<window.frames.length; i++) {
            console.log('frame',window.frames[i]);
            if (window.frames[i].location.origin) {
                goodframe = window.frames[i]
                break;
            }
        }
        return goodframe
    }

    function next_track() {
        var r = new Spotify.Bridge.Responder();
        r.trigger('player_skip_to_next', [{id:'extension'}]);
    }

    function load_models(callback) {
        fr.require('$api/models', function(models) { 
            callback(models);
            // models.player.load(['playing'].done( function(current) { console.log(current) } ) )
        })
    }

    function send_to_content_script(msg) {

        var customEvent = document.createEvent('Event');
        customEvent.initEvent('myCustomEvent', true, true);
        function fireCustomEvent(data) {
            hiddenDiv = document.getElementById('myCustomEventDiv');
            hiddenDiv.innerText = data
            hiddenDiv.dispatchEvent(customEvent);
        }
    }

    send_to_content_script(JSON.stringify( { sender: "web page injected script" } ) )
})();