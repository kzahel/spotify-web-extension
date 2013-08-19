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
    get_playing: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'getplayerstuff' }, cb )
    },
    get_rootlist: function(cb) {
        this.send_to_webpage( { framenum: this._playerframenum, command: 'get_rootlist' }, cb )
    }
}

var bridge_key_events = ['player_play_toggle','player_skip_to_prev','player_skip_to_next','player_seek_backward','player_seek_forward','player_volume_up','player_volume_down','navigation_show_search'] // can call player directly? that wont skip track though, just controls play/pause...
