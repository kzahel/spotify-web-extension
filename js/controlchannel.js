function Stream(manager, installid, info) {
    this._manager = manager;
    this._info = info; // contains whether or not this is initiator
    this._connected = false;
    this._installid = installid;
    this._connecting = false;
    this._remote_connected = false;

    this._rid = 1; // request id
    this._requests = {} // keep track of callbacks

    this._url = 'ws://' + config.controlstream + ':8000/api/v0/ws/device/' + INSTALL_UUID + '/controlchannel?remotedevice=' + encodeURIComponent(installid) + '&sps=' + encodeURIComponent(last_user_info.sps) + '&authuser=' + encodeURIComponent(last_user_info.username) ; // TODO
    this._ws = null;
}
Stream.prototype = {
    connect: function(remote_connect_callback) {
        if (this._connecting) { throw Error('already connecting') }
        this._connecting = true;
        this._remote_connect_callback = remote_connect_callback
        this._ws = new WebSocket(this._url)
        console.log('WS connect',this._url)
        this._ws.onerror = this.onerror.bind(this);
        this._ws.onopen = this.onopen.bind(this);
        this._ws.onclose = this.onclose.bind(this);
        this._ws.onclose = this.onerror.bind(this);
        this._ws.onmessage = this.onmessage.bind(this);
        this._connect_timeout = setTimeout( this.on_connect_timeout.bind(this), 8000 );
    },
    on_connect_timeout: function(evt) {
        console.log('stream','on_connect_timeout',evt)
        this._connecting = false
        this._manager.on_connect_timeout(this)
        this.check_execute_fail_remote_connect_callback("timeout")
    },
    check_execute_fail_remote_connect_callback: function(info) {
        var cb = this._remote_connect_callback;
        this._remote_connect_callback = null;
        if (cb) {
            cb({"error":true, info:info})
        }
    },
    request: function(req, callback) {
        var rid = this._rid++;
        var payload = {req:req, rid:rid}
        this._requests[rid] = callback
        this.send(JSON.stringify(payload))
    },
    onopen: function(evt) {
        clearTimeout( this._connect_timeout )
        this._connect_timeout = null;
        console.log('stream','onopen',evt)
        if (this._info && this._info.initiator === false) {
            _gaq.push(['_trackEvent', 'controlstream', 'invitee_open']);
        } else {
            _gaq.push(['_trackEvent', 'controlstream', 'initiator_open']);
        }

        this._connecting = false
        this._connected = true
    },
    send: function(msg) {
        //console.log('controlstream send',msg);
        this._ws.send(msg)
    },
    onclose: function(evt) {
        this._connected = false;
        console.log("%cREMOTE HOST DISCONNECTED (onclose)!!","background: #B77; color: #000");
        console.log('stream','onclose',evt)
        this._manager.on_stream_closed(this)
        this.check_execute_fail_remote_connect_callback("timeout")
    },
    onerror: function(evt) {
        this._connected = false;
        console.log("%cREMOTE HOST DISCONNECTED (onerror)!!","background: #B77; color: #000");
        console.log('stream','onerror',evt)
        this._manager.on_stream_error(this)
        this.check_execute_fail_remote_connect_callback("timeout")
    },
    onmessage: function(evt) {
        var _this = this;
        //console.log('controlstream onmessage',evt.data)

        var data = JSON.parse(evt.data)
        if (data.sender == 'rendez') {
            if (data.info == 'all_connected') {
                _gaq.push(['_trackEvent', 'controlstream', 'all_connected']);
                console.log("%cREMOTE HOST CONNECTED!!","background: #2B2; color: #000");
                this._remote_connect_callback({"success":true})
                this._remote_connect_callback = null;
                this._remote_connected = true
            } else {
            }
        } else {
            // interpret as a command. require it have a requestid

            var rid = data.rid;
            if (data.req) {
                if (true) {
                    // check whether we've given this user access to our shit
                    console.log('HANDLE REMOTE COMMAND', data)
                    api.handle_remote_request( data.req, function(resp) {
                        console.log('got response from calling method by str',resp);
                        var payload = {resp:resp,rid:rid}
                        _this.send(JSON.stringify(payload))
                    });

                }
            } else if (data.resp) {
                // this is a response to one of our requests
                console.assert(this._requests[rid] !== undefined)
                var callback = this._requests[rid]
                delete this._requests[rid]
                if (callback) {
                    callback( data.resp )
                } else {
                    console.log('response from remote:',data.resp)
                }
            }
        }
    }
}

function ControlChannels() {
    this._streams = {}; // get a unique connection for each remote controlling user.
    // simpler than trying to multiplex a whole bunch (disconnects etc simplified)
}

ControlChannels.prototype = {
    ensure_open_for: function(installid, info, callback) {
        var _this = this;
        var stream = this._streams[installid];
        // somebody wants to remote control us, so open the control channel
        if (stream) {
            if (stream._connected || stream._connecting) {
                // already initiating or have a stream
                callback(stream)
                return
            } else {
                console.assert(false)
            }
        } else {

            // TODO send in which user is requesting... make sure user
            // validates they are who they say they are


            // can specify password or also pass in their proof of logged into play.spotify.com

            get_last_user( function() {
                if (! last_user_info.sps) {
                    callback({error:"you need to login"})
                } else {
                    var stream = new Stream(_this, installid, info, callback);
                    _this._streams[installid] = stream;
                    stream.connect(callback)
                }
            })
        }
    },
    on_stream_closed: function(stream) {
        delete this._streams[stream._installid]
        console.log('manager stream closed')
    },
    on_stream_error: function(stream) {
        delete this._streams[stream._installid]
        console.log('manager stream error')
    },
    on_connect_timeout: function(stream) {
        delete this._streams[stream._installid]
        // perhaps retry?
        console.log('manager connect timeout')
    }
}