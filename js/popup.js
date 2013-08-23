window.bg = null;
function get_background(cb) {
    if (window.bg) { 
        if (cb) { cb() }
    } else {
        chrome.runtime.getBackgroundPage( function(bgpage) {
            bg = bgpage;
            console.log('got background page',bg);
            if (cb) { cb() }
        })
    }
}
get_background();

function $(id) { return document.getElementById(id); }

function do_command(command) {
    get_background( function() {
        console.log('got background',bg)
        bg.api.do_player_command( command, function(response) {
        })
    })    
}

function populate_album_info(cb) {
    console.log('populate_album_info')
    get_background( function() {
        console.log('got background',bg)
        bg.api.get_playing( function(response) {
            console.assert(response)
            console.log('get_playing response',response)

            if (response.error) {
                _gaq.push(['_trackEvent', 
                           'get_playing_poll', 
                           'error,' + (response.timeout?'timeout':'') +','+ (response.info?JSON.stringify(response.info):'')])
                if ($("error").textContent.length < 2) {
                    var href = "https://play.spotify.com/track/3KRAqo71NrfR1UCa34JEsy"
                    if (response.error == 'no connection') {
                        $("error").innerHTML = 'Welcome! It looks like you don\'t have the Web Player open.<br /><a href="'+href+'" target="_blank">Open Spotify</a>'
                    } else {
                        $("error").innerHTML = 'ERROR: ' + JSON.stringify(response) + '<br /><a href="'+href+'" target="_blank">Open Spotify</a>'
                    }
                }
            } else {

                _gaq.push(['_trackEvent', 
                           'get_playing_poll',
                           (response.info.track?'track':'notrack')])

                // TODO - fix up the rendering on this page. it is absolute horseshit and inline html not good for binding events.

                $("error").innerHTML = ''
                var track = response.info.track
                if (track) {
                    var album = track.album
                    var artists = track.artists;
                    var image = track.images[1][1];

                    $("track-albumart").innerHTML = '<img src="'+image+'" />'
                    // UNSAFE UNSAFE use document.createTextNode or whatever
                    $("track-songtitle").innerHTML = '<a target="_blank" href="'+ spotify_uri_to_web_link(track.uri) + '">'+track.name+'</a>'
                    var h = [];
                    for (var i=0; i<artists.length; i++) {
                        h.push('<a target="_blank" href="'+ spotify_uri_to_web_link(artists[i].uri) + '">'+artists[i].name+'</a><br />')
                    }
                    h.push("<br />")

                    for (var key in response.playerState) {
                        h.push(key + ' = ' + response.playerState[key] + '<br />')
                    }

                    if (response.playerState.duration) {
                        var frac = response.playerState.position / response.playerState.duration
                        h.push('<div style="border:1px solid black; width:300px"><div style="background:#090; height:10px; width:'+Math.floor(frac*200)+'px"></div></div>')
                    }


                    $("track-songinfo").innerHTML = h.join('');
                } else {
                    $("error").innerHTML = 'No active music track playing.'
                }
            }
            if (cb) {cb()}
        })
    })
}

function bind_others() {
    var btn = document.querySelector('#get-info');
    btn.addEventListener('click', function(){
        populate_album_info()
    });

    var btn = document.querySelector('#command-playpause');
    btn.addEventListener('click', function() {
        do_command('playpause')
    })

    var btn = document.querySelector('#command-skipforward');
    btn.addEventListener('click', function(){
        do_command('skipforward')
    })
}

function bind_permission_upgrade() {
    var btn = document.querySelector('#add-permissions');
    btn.addEventListener('click', function(event) {
        chrome.tabs.create({active:true, url:'options.html'})
    });
}

function onload() {
    bind_permission_upgrade()
    bind_others()
    track_button_clicks()

    setTimeout( function() {
        updatetick()
    }, 100 )

}

function updatetick() {
    console.log('updatetick')
    // WAIT until page is loaded otherwise we'll get errors...
    populate_album_info( function() {
        setTimeout( updatetick, 2000 )
    })
}

document.addEventListener("DOMContentLoaded", function() {
    onload()
})
