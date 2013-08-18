console.log('popup loaded')

window.bg = null;

function onBackgroundPage(bgpage) {
    bg = bgpage;
    console.log('got background page',bg);
}

chrome.runtime.getBackgroundPage(onBackgroundPage);

// background page can also talk to useing using simple
// window.postMessage, but ports seem cooler ... ?  advantage of port
// is it could work with other extensions dont use it, because we have
// direct access to the background page javascript state

var port = chrome.runtime.connect({name: "popup"});

port.postMessage({message: "popup loaded"});
port.onMessage.addListener(function(msg) {
    console.log('received message on port',msg);
});

function $(id) { return document.getElementById(id); }

function populate_album_info() {
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
}

function bind_get_info() {
    var btn = document.querySelector('#get-info');
    btn.addEventListener('click', populate_album_info);
}

function bind_permission_upgrade() {
    var btn = document.querySelector('#add-permissions');

    btn.addEventListener('click', function(event) {
	chrome.permissions.request({
	    permissions: ["tabs","notifications","contextMenus"],
	    origins: ["<all_urls>"]
	}, function(granted) {
	    // The callback argument will be true if the user granted the permissions.
	    if (granted) {
                port.postMessage("granted all permissions")
		console.log('permission granted!!!');
	    } else {
                port.postMessage("failed to grant permissions")
		console.log('permission deeeenied!');
	    }
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
