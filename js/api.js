// some potentially useful functions ...

// Spotify.Api.nextSong(), playpause(), getSongPlayed(), getArt(), getQueue(), etc


function SpotifyWebAPI() {
    this._requests = {}
    this._requestctr = 1;
    this._timeout_interval = 2000;
    this._playerframenum = 0;
}
SpotifyWebAPI.prototype = {
    get_conn: function() {
        return content_conns.get_active()
    },
    handle_request_timeout: function(requestid) {
        console.log('API request timeout',requestid)
        var callbackinfo = this._requests[requestid]
        delete this._requests[requestid]
        if (callbackinfo.callback) { callbackinfo.callback({error:true,timeout:true}) }
    },
    send_to_webpage: function(msg, cb) {
        var requestid = this._requestctr++
        var request_timeout = setTimeout( this.handle_request_timeout.bind(this, requestid), this._timeout_interval );
        this._requests[requestid] = {callback:cb, timeout:request_timeout}
        console.log('requests',this._requests);
        var conn = this.get_conn()
        if (! conn) {
            cb({error:"no connection"})
        } else {
            conn.send_api_message_to_webpage( requestid, msg )
        }
    },
    handle_remote_request: function(req, callback) {
        if (req && req.method) {
            // TODO -- whitelist methods
            // handle the request as if it were made to the local spotify api
            console.assert(req.method)
            var args = req.args
            if (! req.args) {
                args = []
            }
            args.push( callback )
            var method = api[req.method];
            console.log('handling remote command with method',method,'and args',req.args)
            method.apply(api, args)
        } else {
            var resp = 'not sure how to handle remote request'
            console.log(resp,req)
            callback(resp)
        }
    },
    handle_webpage_api_response: function(msg) {
        console.log('SpotifyWebAPI handle response!',msg)
        var callbackinfo = this._requests[msg.requestid]
        if (! callbackinfo) {
            console.log('WARNING -- duplicate response received :-(')
            return
        }
        console.assert( callbackinfo ) // response came back after timeout_interval
        clearTimeout( callbackinfo.timeout )
        delete this._requests[msg.requestid]
        var cb = callbackinfo.callback;
        if (cb) {
            cb(msg.payload);
        }
    },
    get_frames: function(cb) {
        this.send_to_webpage( { command: 'getframes' }, cb )
        // set this._playerframenum
    },
    do_player_command: function(command, cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'do_player_command', commandargs:command }, cb )
    },
    request: function(command, cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: command }, cb )
    },
    get_playing: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'getplayerstuff' }, cb )
    },
    get_rootlist: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'get_rootlist' }, cb )
    },
    get_user: function(cb) {
        this.request('getuser', 
                     function(result) { 
                         if (result.error) {
                             cb(null)
                         } else {
                             fetch_session_cookie( function(c) {
                                 chrome.storage.local.set({'username':result.user.username,
                                                           'sps': c.value
                                                          })
                                 cb(result.user)
                             })
                         }
                     })
    }
}

var bridge_key_events = ['player_play_toggle','player_skip_to_prev','player_skip_to_next','player_seek_backward','player_seek_forward','player_volume_up','player_volume_down','navigation_show_search'] // can call player directly? that wont skip track though, just controls play/pause...

function PushAPI() {
}
PushAPI.prototype = {
    register: function(data) {
        // registers a remote controllable spotify web client

        console.log("REGISTER with server",data)

        var xhr = new XMLHttpRequest;
        xhr.open( 'POST', config.pushserver + '/api/v0/device/'+INSTALL_UUID+'/register', true )
        var body = data
        xhr.setRequestHeader('Content-type','application/json')
        xhr.send( JSON.stringify(body) )
        xhr.onload = function(evt) {
            console.log('register response',xhr,evt)
        }
    },
    get_my_basic_info: function(callback) {
        // TODO -- store channel id globally?
        chrome.pushMessaging.getChannelId(false, function(resp) {
            if (resp && resp.channelId) {
                var data = { install_id: INSTALL_UUID,
                             device: get_device(),
                             channel: resp.channelId }
                callback(data)
            } else {
                callback({error:true})
            }
        })
    },

    send_command: function(installid, command, callback) {
        // sends a command to device "installid"
        // backend will verify that this user has permission

        api.get_user(function(user) {
            control
        })
    },

    pingback: function() {
        console.log("Ping back in with server")
        this.get_my_basic_info( function(data) {
            data.uptime = (new Date() - BG_LOAD_TIME)
            var xhr = new XMLHttpRequest;
            xhr.open( 'POST', config.pushserver + '/api/v0/device/'+INSTALL_UUID+'/pingback', true )
            xhr.setRequestHeader('Content-type','application/json')
            xhr.send( JSON.stringify(data) )
            xhr.onload = function(evt) {
                console.log('pingback response',xhr,evt)
            }
        })
    }
}

function RemoteDevices() {
}

RemoteDevices.prototype = {
    fetch_user_devices: function(username, sps, listcb) {
        // fetches all devices for a user (TODO "authuser" credential needs to be checked :-))
        var xhr = new XMLHttpRequest;
        xhr.open( 'GET', config.pushserver + '/api/v0/device/list?authuser=' + encodeURIComponent(username) + '&sps=' + encodeURIComponent(sps))
        xhr.setRequestHeader('Content-type','application/json')
        xhr.send()

        xhr.onload = function(evt) {
            var data = JSON.parse(evt.target.responseText)
            if (listcb) {listcb(data)} else { console.log('fetched devices',data) }
        }
        xhr.onerror = function(evt) {
            console.log('device list response err',xhr,evt);
            if (listcb) {listcb({error:true})}
        }
    },
    list: function(listcb) {
        get_last_user( function(userdata) {
            var username = userdata.username;
            var sps = userdata.sps;
            this.fetch_user_devices(username, sps, listcb)
        }.bind(this))
    },
    allow_access: function(from_user, receiver, listcb) {
        // allows others to access the current account
        get_last_user( function(username) {
            var xhr = new XMLHttpRequest;
            xhr.open( 'GET', config.pushserver + 
                      '/api/v0/device/' + INSTALL_UUID + '/share' +
                      '?authuser='+ encodeURIComponent(username) +
                      '&receiver=' + encodeURIComponent(receiver) );
            xhr.setRequestHeader('Content-type','application/json')
            xhr.send()

            xhr.onload = function(evt) {
                var data = JSON.parse(evt.target.responseText)
                if (listcb) {listcb(data)} else { console.log('device share',data) }
            }
            xhr.onerror = function(evt) {
                console.log('device share err',xhr,evt);
                if (listcb) {listcb({error:true})}
            }
            
        })
    }
}