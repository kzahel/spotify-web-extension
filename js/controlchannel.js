function Stream(manager, username, url) {
    this._manager = manager;
    this._connected = false;
    this._username = username;
    this._connecting = false;
    this._ws = null;
}
Stream.prototype = {
    connect: function(url) {
        if (this._connecting) { throw Error('already connecting') }
        this._connecting = true;
        this._ws = new WebSocket(url)
        this._ws.onerror = this.onerror.bind(this);
        this._ws.onopen = this.onopen.bind(this);
        this._ws.onclose = this.onclose.bind(this);
        this._ws.onclose = this.onerror.bind(this);
        this._ws.onmessage = this.onmessage.bind(this);
        this._connect_timeout = setTimeout( this.on_connect_timeout.bind(this), 8000 );
    },
    on_connect_timeout: function(evt) {
        console.log('stream',this,'on_connect_timeout',evt)
        this._connecting = false
        this.manager.on_connect_timeout(this)
    },
    onopen: function(evt) {
        console.log('stream',this,'onopen',evt)
        this._connecting = false
        this._connected = true
    },
    onclose: function(evt) {
        console.log('stream',this,'onclose',evt)
        this.manager.on_stream_closed(this)
    },
    onerror: function(evt) {
        console.log('stream',this,'onerror',evt)
    },
    onmessage: function(evt) {
        console.log('stream',this,'onmessage',evt)
    }
}

function ControlChannels() {
    this._streams = {}; // get a unique connection for each remote controlling user.
    // simpler than trying to multiplex a whole bunch (disconnects etc simplified)
}

ControlChannels.prototype = {
    ensure_open_for: function(installid, callback) {
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

            var url = 'ws://' + config.controlstream + '/api/v0/device/' + INSTALL_GUID + '/controlchannel?remotedevice=' + encodeURIComponent(installid) + '&password=99bananas';
            // can specify password or also pass in their proof of logged into play.spotify.com

            var stream = new Stream(this, username, url);
        }
    },
    on_stream_closed: function(stream) {
        console.log('manager stream closed',stream)
        
    },
    on_connect_timeout: function(stream) {
        // perhaps retry?
        console.log('manager connect timeout',stream)
    }
    
}