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
            console.log('get_playing response',response)
            var track = response.info.track
            var album = track.album
            var artists = track.artists;
            var image = track.images[1][1];

            $("track-albumart").innerHTML = '<img src="'+image+'" />'

            // UNSAFE UNSAFE use document.createTextNode or whatever
            $("track-songtitle").innerHTML = '<a href="'+ track.uri + '">'+track.name+'</a>'
            var h = [];
            for (var i=0; i<artists.length; i++) {
                h.push('<a href="'+ artists[i].uri + '">'+artists[i].name+'</a>')
            }
            h.push(JSON.stringify(response.playerState))

            $("track-songinfo").innerHTML = h.join('');
            if (cb) {cb()}
        })
    })
}

function bind_others() {
    var btn = document.querySelector('#get-info');
    btn.addEventListener('click', populate_album_info);

    var btn = document.querySelector('#command-playpause');
    btn.addEventListener('click', function() {do_command('playpause')})

    var btn = document.querySelector('#command-skipforward');
    btn.addEventListener('click', function(){do_command('skipforward')})
}

function bind_permission_upgrade() {
    var btn = document.querySelector('#add-permissions');

    btn.addEventListener('click', function(event) {
	chrome.permissions.request({
	    permissions: ["notifications","contextMenus"],
	    origins: ["<all_urls>"]
	}, function(granted) {

            get_background( function() {

	        // The callback argument will be true if the user granted the permissions.
	        if (granted) {

                    bg.on_new_permissions()

                    bg.postMessage("granted all permissions",bg.location.origin)
		    console.log('permission granted!!!');
	        } else {
                    bg.postMessage("failed to grant permissions",bg.location.origin)
		    console.log('permission deeeenied!');
	        }
            })
	});
    });
}

function onload() {
    bind_permission_upgrade()
    bind_others()
    //populate_album_info()

    setTimeout( function() {
        updatetick()
    }, 100 )

}

function updatetick() {
    console.log('updatetick')
    populate_album_info( function() {

        setTimeout( updatetick, 1000 )
    })
}

document.addEventListener("DOMContentLoaded", function() {
    onload()
})
