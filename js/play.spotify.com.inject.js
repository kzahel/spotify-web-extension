(function() {
    var injected_config_varname = '_____________config';
    var config = window[injected_config_varname];

    function find_good_frames() {
        var goodframes = [];
        for (var i=0; i<window.frames.length; i++) {
            if (window.frames[i].location.origin) {
                goodframes.push({num:i, frame: window.frames[i]})
            }
        }
        return goodframes
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

    function respond_to_api_message(request, payload) {
        send_to_content_script( { requestid: request.requestid,
                                  payload: payload } )
    }

    window.addEventListener('message', function(evt) {
        //HANDLE API MESSAGE        this.port.postMessage( { requestid: requestid, cc: config.pagename, payload: msg } )

        if (evt.source == window) { // from our own content script :-)
            if (evt.data.requestid && evt.data.cc && evt.data.payload) {
                var request = evt.data
                var payload = evt.data.payload
                console.log('handling custom extension API message',payload.command,'with request id',evt.data.requestid);

                if (payload.command == 'getframes') {

                    var frames = find_good_frames()

                    respond_to_api_message( request, { info: "queried good frames and returning data :-)", numframes: frames.length } )

                } else {
                    console.error('unrecognized API message',payload.command, evt);
                }
                

            }
        }





    });

})();