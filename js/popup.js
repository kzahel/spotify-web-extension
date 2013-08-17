console.log('popup loaded')

var background = null;

function onBackgroundPage(bg) {
    background = bg;
    console.log('got background page',bg);
}

chrome.runtime.getBackgroundPage(onBackgroundPage);
// background page can also talk to use using simple
// window.postMessage, but ports seem cooler ... ?



var port = chrome.runtime.connect({name: "popup"});

port.postMessage({message: "popup loaded"});
port.onMessage.addListener(function(msg) {
    console.log('received message on port',msg);
});


document.addEventListener("DOMContentLoaded", function() {

    var btn = document.querySelector('#add-permissions');

    //chrome.app.getDetails()

    btn.addEventListener('click', function(event) {
	// Permissions must be requested from inside a user gesture, like a button's
	// click handler.
	chrome.permissions.request({
	    permissions: ["tabs"],
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
})
