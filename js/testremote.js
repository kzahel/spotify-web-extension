// example remote control stuff
window.bg = null
window.installid = null


chrome.runtime.getBackgroundPage( function(bg) {
    window.bg = bg

    bg.remotes.list( function(remotes) {
        console.log("REMOTES:",remotes)

        //var installid = "0n523t5k1s4e3c4b5c690m28367i332g"

        window.installid = remotes.shared_devices[0].installid;

        if (window.location.search) {
            var stripped = window.location.search.slice(1,window.location.search.length)
            window.installid = decodeURIComponent(stripped.split('=')[1])
        }
/*
        console.log('open comm with ',
                    remotes.shared_devices[0].username,',',
                    remotes.shared_devices[0].deviceinfo)
  */                  

        bg.controlchannels.ensure_open_for(installid, {initiator:true}, function(d){
            console.log('remote connected',d)


            updatetick() // starts the polling


            //bg.controlchannels._streams[installid].request({method:"get_playing"}, function(c){console.log('resp',c)})


            //bg.controlchannels._streams[installid].request({method:"do_player_command",args:["skipforward"]}, function(c){console.log('resp',c)})


            //bg.controlchannels._streams[installid].request({method:"do_player_command",args:["playpause"]}, function(c){console.log('resp',c)})


        });


    })
})


function bind_others() {
    var btn = document.querySelector('#uri');
    btn.addEventListener('keypress', function(evt){
        console.log(evt.keyCode)
        if (evt.keyCode == 13) {
            console.log("ENTER")
            remote_api.do_player_command( {method:'openUri', arguments:{uri:evt.target.innerText}}, function(response) {
                console.log('did player command', response)
            })
        }
    });


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



function updatetick() {
    console.log('updatetick')
    // WAIT until page is loaded otherwise we'll get errors...

    populate_album_info( function() {
        setTimeout( updatetick, 2000 )
    })
}


document.addEventListener("DOMContentLoaded", function() {
    console.log('dom content loaded')
    bind_others()

})


function populate_album_info(cb) {
    console.log('populate_album_info')

        console.log('got background',bg)
        remote_api.get_playing( function(response) {
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

                    if (track.images) {
                        var image = track.images[1][1];

                        $("track-albumart").innerHTML = '<img src="'+image+'" />'
                    }
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

                    if (response.info && response.info.context && response.info.context.uri) {
                        h.push('context = ' + response.info.context.uri + '<br />')
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

}

function $(id) { return document.getElementById(id); }

var remote_api = {
    do_player_command: function(command, callback) {
        bg.controlchannels._streams[installid].request({method:"do_player_command",args:[command]}, callback)
    },
    get_playing: function(callback) {
        bg.controlchannels._streams[installid].request({method:"get_playing"}, callback)
    }
}

function do_command(command) {
    remote_api.do_player_command( command, function(response) {
        console.log('did player command', response)
    })
}
