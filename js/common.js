var config = {
    extension_id: "gkmfagbigbkgjbbphlemmafhjabeofek", // released version
//    pagename: "www.jstorrent.com", // debugging on a faster to load page
    pagename: "play.spotify.com",
    injected_config_varname: '_____________config',
    hidden_div_id: '________gkmfagbigbkgjbbphlemmafhjabeofek',
    hidden_div_event_name: 'event:gkmfagbigbkgjbbphlemmafhjabeofek',
    use_desktop_spotify: false // preventDefault on spotify: URLS
};

/*
these functions are DUPLICATED in any injected scripts that need to
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

// this should have fewer side effects than window.postMessage
function custom_dom_event(msg, source) {
    msg.source = source
    var evt = new CustomEvent(config.hidden_div_event_name, {detail:msg});
    evt.initEvent(config.hidden_div_event_name, false, false);
    var d = get_hidden_div()
    //d.innerText = JSON.stringify(msg)
    d.dispatchEvent(evt)
}

config;