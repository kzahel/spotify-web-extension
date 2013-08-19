(function() {
    var injected_config_varname = '_____________config';
    var config = window[injected_config_varname];
    console.assert(config) // this means the injection script ran twice! bad! huh?
    delete window[injected_config_varname];


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
        // but i don't know which dom node to use, and am scared to create an empty one ( i probably shouldn't be...)

        var customEvent = document.createEvent('Event');
        customEvent.initEvent('myCustomEvent', true, true);
        function fireCustomEvent(data) {
            hiddenDiv = document.getElementById('myCustomEventDiv');
            hiddenDiv.innerText = data
            hiddenDiv.dispatchEvent(customEvent);
        }
    }

    function send_to_content_script(msg) {
        window.postMessage([{sender:"extension", 
                             message: msg,
                             injected_script: config.pagename + '.inject.js', 
                             extension_id: config.extension_id}],
                           window.location.origin)
    }

    function respond_to_api_message(request, payload) {
        console.log('respond to api message!',payload)
        send_to_content_script( { requestid: request.requestid,
                                  payload: payload } )
    }


    var _cache = {}

    // this is being added TWICE sometimes... ?
    window.addEventListener('message', function(evt) {
        var data = evt.data

        if (evt.source == window) { // from our own content script :-) (hopefully)
            if (data.length !== undefined) {
                data = data[0] // hack because main page throws annoying exception if we send an object
            }

            if (data.requestid && data.cc && data.payload) {

                var request = data
                var payload = data.payload
                console.log('handling custom extension API message',payload.command,'with request id',data.requestid);
                if (payload.command == 'getframes') {

                    var frames = find_good_frames()

                    respond_to_api_message( request, { info: "queried good frames and returning data :-)", 
                                                       frames: frames.map( function(fi) { return [fi.num, fi.frame.location.pathname] }),
                                                       numframes: frames.length })
                } else if (payload.command == 'do_player_command') {
                    var command = payload.commandargs
                    var player = coreJs.getMainPlayer()
                    var possible = ['play','playpause','pause','resume','seek','setMasterVolume','setVolume','stop'];
                    var response = {}

                    if (command == 'skipforward') {
                        var r = new Spotify.Bridge.Responder();
                        r.trigger('player_skip_to_next', [{id:'extension'}]);
                    } else if (command == 'playpause') {
                        player.playpause()
                    } else {
                        response.error=true
                        response.info='unrecognized command'
                    }
                    respond_to_api_message(request, response)

                } else if (payload.command == 'getplayerstuff') {

                    var frame = window.frames[payload.framenum]

                    frame.require('$api/models', function(models) {
                        models.player.load(['playing']).done( function(current) {

                            var player = coreJs.getMainPlayer()

                            var response = {
                                info: current,
                                playerState: player.getPlayerState()
                            };
                            respond_to_api_message( request, response );
                        })
                    })

                } else if (payload.command == 'get_rootlist') {
                    var frame = window.frames[payload.framenum]

                    frame.require('$api/models', function(models) {
                        models.Playlist.fromURI(['']).done( function(current) {
                            var response = {
                                info: current
                            };
                            respond_to_api_message( request, response );
                        })
                    })
                } else {
                    console.error('unrecognized API message',payload.command, evt);
                }
                

            }
        }





    });

})();