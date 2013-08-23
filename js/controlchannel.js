function Stream(manager, installid) {
    this._manager = manager;
    this._connected = false;
    this._installid = installid;
    this._connecting = false;
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
    },
    onmessage: function(evt) {
        console.log('stream','onmessage',evt)
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


            // can specify password or also pass in their proof of logged into play.spotify.com

            var stream = new Stream(this, installid);
            this._streams[installid] = stream;
            stream.connect()
        }
    },
    on_stream_closed: function(stream) {
        delete this._streams[stream._installid]
        console.log('manager stream closed')
        
    },
    on_connect_timeout: function(stream) {
        delete this._streams[stream._installid]
        // perhaps retry?
        console.log('manager connect timeout')
    }
    
}