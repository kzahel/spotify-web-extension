function Stream(manager, installid, info) {
    this._manager = manager;
    this._info = info; // contains whether or not this is initiator
    this._connected = false;
    this._installid = installid;
    this._connecting = false;
    this._remote_connected = false;
    this._url = 'ws://' + config.controlstream + ':8000/api/v0/ws/device/' + INSTALL_UUID + '/controlchannel?remotedevice=' + encodeURIComponent(installid) + '&password=99bananas';
    this._ws = null;
}
Stream.prototype = {
    connect: function(url) {
        if (this._connecting) { throw Error('already connecting') }
        this._connecting = true;
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
    onclose: function(evt) {
        this._connected = false;
        console.log('stream','onclose',evt)
        this._manager.on_stream_closed(this)
    },
    onerror: function(evt) {
        this._connected = false;
        console.log('stream','onerror',evt)
        this._manager.on_stream_error(this)
    },
    onmessage: function(evt) {
        console.log('controlstream onmessage',evt.data)
        var data = JSON.parse(evt.data)
        if (data.sender == 'rendez') {
            if (data.info == 'all_connected') {
                _gaq.push(['_trackEvent', 'controlstream', 'all_connected']);
                console.log("%cREMOTE HOST CONNECTED!!","background: #2B2; color: #00000");
                this._remote_connected = true
            } else {
            }
        } else {
            // interpret as a command. require it have a requestid

            var requestid = data.rid;
            if (true) {
                // check whether we've given this user access to our shit
                console.log('HANDLE REMOTE COMMAND', data)
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

            var stream = new Stream(this, installid, info);
            this._streams[installid] = stream;
            stream.connect()
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