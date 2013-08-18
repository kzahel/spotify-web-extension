console.log('popup loaded')

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

// background page can also talk to useing using simple
// window.postMessage, but ports seem cooler ... ?  advantage of port
// is it could work with other extensions dont use it, because we have
// direct access to the background page javascript state



// dont need this.
function setup_port() {
    var port = chrome.runtime.connect({name: "popup"});
    port.postMessage({message: "popup loaded"});
    port.onMessage.addListener(function(msg) {
        console.log('received message on port',msg);
    });
    port.onDisconnect.addListener(function() {
        console.log('port disconnected',port)
    });
    return port
}

function $(id) { return document.getElementById(id); }

function populate_album_info() {
    get_background( function() {
        bg.api.get_playing( function(response) {
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
            $("track-songinfo").innerHTML = h.join('');
        })
    })
}

function bind_get_info() {
    var btn = document.querySelector('#get-info');
    btn.addEventListener('click', populate_album_info);
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
    bind_get_info()
}

document.addEventListener("DOMContentLoaded", function() {
    onload()
})
