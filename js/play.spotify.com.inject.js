var inject_function = (function() {

    function Fucker(){}

    function Web(){
        this._actualLogin = undefined;
        this._actualApp = undefined;

        var _this = this;

        this._fakeApp = undefined

        function CreateFakeApp() {
            var obj = {}
            for (var key in _this._actualApp) {
                obj[key] = _this._actualApp[key]
            }

            // fuck with the app initialize constructor to steal variables
            obj.initialize = function() {
                _this._actualApp.initialize.apply(this, arguments)
            }
            _this._fakeApp = obj
        }

        function MyLogin(doc, config, version) {
            this._arguments = []
            for (var i=0; i<arguments.length; i++) {
                this._arguments.push(arguments[i])
            }
            this.doc = doc
            this.config = config
            this.version = version

            _this._actualLogin.apply(this, arguments)
            this.init = function() {
                debugger;
            }

        }

        this.__defineGetter__("Login", function(){
            return MyLogin;
            // return this._actualLogin
        });
        this.__defineSetter__("Login", function(val){
            debugger;
            _this._actualLogin = val;
        });

        this.__defineGetter__("App", function(){
            return _this._fakeApp
        });
        this.__defineSetter__("App", function(val){
            _this._actualApp = val;
            CreateFakeApp()
        });

    }

    window.Spotify = new Fucker
    Spotify.Web = new Web

    document.onreadystatechange = function(evt) {
        //console.log('READYSTATE',evt, evt.eventPhase, window.Spotify);
    }


    var injected_config_varname = '_____________config';
    var config = window[injected_config_varname];
    console.assert(config) // this means the injection script ran twice! bad! huh?
    delete window[injected_config_varname];

    // MAKE SURE IN SYNC WITH COMMON.js
    function get_hidden_div() {
        var d = document.getElementById(config.hidden_div_id);
        if (d) {
            return d
        }
        d = document.createElement('div')
        d.id = config.hidden_div_id
        d.style.display = 'none'
        document.body.appendChild(d)
        return d
    }
    // MAKE SURE IN SYNC WITH COMMON.js
    function custom_dom_event(msg, source) {
        msg.source = source
        var evt = new CustomEvent(config.hidden_div_event_name, {detail:msg});
        evt.initEvent(config.hidden_div_event_name, false, false);
        var d = get_hidden_div()
        //d.innerText = JSON.stringify(msg)
        d.dispatchEvent(evt)
    }



    function on_receive_message_from_content_script(msg) {
        var data = msg.detail;
        if (data.source == 'injected_script') {
            // ignore
        } else {
            handle_api_request(data)
        }
    }


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
        })
    }

    function send_to_content_script(msg) {

        var tosend = {sender:"extension", 
                      message: msg,
                      injected_script: config.pagename + '.inject.js', 
                      extension_id: config.extension_id}

        custom_dom_event(tosend, 'injected_script')

        // too many side effects this way
        //window.postMessage([tosend],
        //                   window.location.origin)
    }

    function respond_to_api_message(request, payload) {
        console.log('respond to api message!',payload)
        send_to_content_script( { requestid: request.requestid,
                                  payload: payload } )
    }


    function handle_api_request(data) {
        console.assert(data.requestid && data.cc && data.payload)
        var request = data
        var payload = data.payload
        console.log('handling custom extension API message',payload.command,'with request id',data.requestid);
        if (payload.command == 'getframes') {

            var frames = find_good_frames()

            respond_to_api_message( request, { info: "queried good frames and returning data :-)", 
                                               frames: frames.map( function(fi) { return [fi.num, fi.frame.location.pathname] }),
                                               numframes: frames.length })
        } else if (payload.command == 'do_player_command') {
            // all requests should come through this...

            var command = payload.commandargs
            var player = coreJs.getMainPlayer()
            var bridge_possible = ['play','playpause','pause','resume','seek','setMasterVolume','setVolume','stop'];
            var response = {}

            if (command && command.method == 'openUri') {
                // do something better!
                window.location = command.arguments.uri;
            } else if (command == 'reload') {
                // reload the url
                window.location.reload()
            } else if (command == 'skipforward') {
                var r = new Spotify.Bridge.Responder();
                r.trigger('player_skip_to_next', 
                          [{id:'extension'}],
                          function(r) {
                              console.log("SKIP SUCCESS RESULT",r)
                          },
                          function(r) {
                              console.log("SKIP ERROR RESULT",r)
                          }
                         );
            } else if (command == 'playpause') {
                player.playpause()
            } else {
                response.error=true
                response.info='unrecognized command'
            }
            respond_to_api_message(request, response)
        } else if (payload.command == 'getuser') {
            var frame = window.frames[payload.framenum]
            frame.require('$api/models', function(models) {
                // * var user = models.User.fromUsername('**freer!de**'); // to load specific user
                models.session.user.load(['username']).done( function(user) {
                    var response = {
                        user: user
                    }
                    return respond_to_api_message(request,
                                                  response)
                });
            })
        } else if (payload.command == 'getplayerstuff') {

            var frame = window.frames[payload.framenum]
            if (! frame) {
                return respond_to_api_message(request, {error:true,info:'noframe:'+payload.framenum})
            }

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

    var exconfig = config

    // TODO -- move back inside closure
    function grab_config(callback) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", 'https://' + exconfig.pagename, true);
        xhr.onload = function(evt) {
            var config = {error:true}
            try {
                var myre = /Spotify.Web.Login\(document, ([\s\S]*}}),/;
                var rematch = myre.exec(evt.target.responseText)[1]
                config = JSON.parse(rematch)
            } catch(e) {
                console.log('grab config error',e)
            }
            callback(config)
        }
        xhr.onerror = function(){callback({error:true})}
        xhr.send()
    }


    function listen_for_hidden_div_events() {
        get_hidden_div().addEventListener(config.hidden_div_event_name, on_receive_message_from_content_script)
    }

    // console.assert( ! document.body )

    if (document.body && document.readyState == 'complete') {
        // TODO -- make sure this works correctly,
        listen_for_hidden_div_events()
    } else {
        document.addEventListener("DOMContentLoaded", function() {
            listen_for_hidden_div_events()
        })
    }

})
