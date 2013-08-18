(function() {
    var injected_config_varname = '_____________config';
    var config = window[injected_config_varname];

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

    function send_to_content_script_using_custom_event(msg) {
        // this might be more secretive than window.postMessage, and have fewer side effects

        var customEvent = document.createEvent('Event');
        customEvent.initEvent('myCustomEvent', true, true);
        function fireCustomEvent(data) {
            hiddenDiv = document.getElementById('myCustomEventDiv');
            hiddenDiv.innerText = data
            hiddenDiv.dispatchEvent(customEvent);
        }
    }

    function send_to_content_script(msg) {
        window.postMessage({sender:"extension", 
                            message: msg,
                            injected_script: config.pagename + '.inject.js', 
                            extension_id: config.extension_id}, 
                           window.location.origin)
    }

    send_to_content_script("hello. extension successfully injected code into main javascript context");



})();