var config = {
    extension_id: "gkmfagbigbkgjbbphlemmafhjabeofek", // released version
//    pagename: "www.jstorrent.com", // debugging on a faster to load page
    pagename: "play.spotify.com",
    pushserver: "http://spotifyconnect.com",
    controlstream: 'spotifyconnect.com',
    website: "http://www.spotifyconnect.com",
    injected_config_varname: '_____________config',
    hidden_div_id: '________gkmfagbigbkgjbbphlemmafhjabeofek',
    hidden_div_event_name: 'event:gkmfagbigbkgjbbphlemmafhjabeofek',
    use_desktop_spotify: false // preventDefault on spotify: URLS
};

function get_last_user(callback) {
    // returns the last logged in username
    chrome.storage.local.get('username',function(data) {
        callback(data && data.username)
    })
}

/*
these two functions are DUPLICATED in any injected scripts that need to
communicate with the content script (we could also use a
preprocessor...)  */



function spotify_uri_to_web_link(href) {
    var parts = href.split(':')
    parts.shift(1)
    link = 'https://play.spotify.com/' + parts.join('/')
    return link
}

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

/* end duplicated */

function pad16(v) {
    var s = v.toString(16)
    return (s.length == 2 ? s : '0' + s)
}

function randombytes_in_base(n,b) {
    var s = []
    var arr = new Uint8Array(n)
    var bytes = window.crypto.getRandomValues(arr)
    for (var i=0; i<bytes.length; i++) {
        s.push( pad16(bytes[i].toString(b) ) )
    }
    return s.join('')
}

function uuid4() {
    arr = new Uint8Array(16)
    var bytes = window.crypto.getRandomValues(arr)
    var s = []
    s.push( pad16(bytes[0]) )
    s.push( pad16(bytes[1]) )
    s.push( pad16(bytes[2]) )
    s.push( pad16(bytes[3]) )
    s.push( '-' )
    s.push( pad16(bytes[4]) )
    s.push( pad16(bytes[5]) )
    s.push( '-' )
    s.push( '4' )
    s.push( pad16(bytes[6]).slice(1,2) )
    s.push( pad16(bytes[7]) )
    s.push( '-' )
    s.push( 'y' )
    s.push( pad16(bytes[8]).slice(1,2) )
    s.push( pad16(bytes[9]) )
    s.push( '-' )
    for (var i=10;i<16;i++) {
        s.push( pad16(bytes[i]) )
    }
    return s.join('')
}

function custom_dom_event(msg, source) {
    msg.source = source
    var evt = new CustomEvent(config.hidden_div_event_name, {detail:msg});
    evt.initEvent(config.hidden_div_event_name, false, false);
    var d = get_hidden_div()
    d.dispatchEvent(evt)
}

config;