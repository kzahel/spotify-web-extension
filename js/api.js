// some potentially useful functions ...

// Spotify.Api.nextSong(), playpause(), getSongPlayed(), getArt(), getQueue(), etc


function SpotifyWebAPI() {
    this._requests = {}
    this._requestctr = 1;
    this._timeout_interval = 40000;
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
        if (callbackinfo.callback) { callbackinfo.callback({timeout:true}) }
    },
    send_to_webpage: function(msg, cb) {
        var requestid = this._requestctr++
        var request_timeout = setTimeout( this.handle_request_timeout.bind(this, requestid), this._timeout_interval );
        this._requests[requestid] = {callback:cb, timeout:request_timeout}
        console.log('requests',this._requests);
        var conn = this.get_conn()
        console.assert( conn )
        conn.send_api_message_to_webpage( requestid, msg )
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
    get_playing: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'getplayerstuff' }, cb )
    },
    get_rootlist: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'get_rootlist' }, cb )
    }
}
