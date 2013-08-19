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

// Save this script as `options.js`

// Saves options to localStorage.
function save_options() {
    var select = document.getElementById("color");
    var color = select.children[select.selectedIndex].value;
    localStorage["favorite_color"] = color;

    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.innerHTML = "Options Saved.";
    setTimeout(function() {
        status.innerHTML = "";
    }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
    var favorite = localStorage["favorite_color"];
    if (!favorite) {
        return;
    }
    var select = document.getElementById("color");
    for (var i = 0; i < select.children.length; i++) {
        var child = select.children[i];
        if (child.value == favorite) {
            child.selected = "true";
            break;
        }
    }
}
//document.addEventListener('DOMContentLoaded', restore_options);
//document.querySelector('#save').addEventListener('click', save_options);



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

                    document.getElementById('info-result').innerText = 'PERMISSION granted!'

                    bg.on_new_permissions()

                    bg.postMessage("granted all permissions",bg.location.origin)
		    console.log('permission granted!!!');
	        } else {
                    document.getElementById('info-result').innerText = 'PERMISSION not granted'

                    bg.postMessage("failed to grant permissions",bg.location.origin)
		    console.log('permission deeeenied!');
	        }
            })
	});
    });
}


document.addEventListener("DOMContentLoaded", function() {
    bind_permission_upgrade()
})
