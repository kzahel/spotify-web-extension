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

function bind_channel_button() {
    var btn = document.querySelector('#setup-channel');
    btn.addEventListener('click', function(event) {
        get_background( function() {
            bg.api.get_user(function(user) {
                fetch_session_cookie( function(spcookie) {
                    if (user) {
                        setup_push()
                        // store this user in local settings...
                        var userinfo = {'username':user.username,'sps':spcookie.value}

                        chrome.storage.local.set(userinfo)
                        window.last_user_info = userinfo
                    } else {
                        notify('error getting user! Please log into spotify and keep the tab open.')
                    }
                })

            });
        });
    })
}

function notify(msg) {
    var elt = document.getElementById('info-result')
    elt.style.color= '#03d'
    elt.innerText = msg

}


function setup_push() {
    // interactive = true
    chrome.pushMessaging.getChannelId(true, function(resp) {
        console.log('channel setup resp',resp)

        if (resp && resp.channelId) {
            notify('channel:'+JSON.stringify(resp) + ', username:'+last_user_info.username )
            get_background( function() {

                    // get spotify session cookie

                var register_data = { install_id: bg.config.installid,
                                      device: bg.get_device(),
                                      sps: last_user_info.sps,
                                      username: last_user_info.username, 
                                      channel: resp.channelId }

                bg.pushapi.register( register_data, function(res) {
                    console.log('register push data',register_data,'got result',res)
                    notify('register channel with backend result...:' + JSON.stringify(res));
                } )

            })
        } else {
            notify('unable to setup push channel')
        }


    })
}

function bind_youtube_permission_upgrade() {
    var btn = document.querySelector('#add-permissions-youtube');
    btn.addEventListener('click', function(event) {
	chrome.permissions.request({
	    permissions: [],
	    origins: ["*://www.youtube.com/*"]
	}, function(granted) {

            get_background( function() {

	        // The callback argument will be true if the user granted the permissions.
	        if (granted) {
                    _gaq.push(['_trackEvent', 'permission-youtube', 'granted']);
                    document.getElementById('info-result').innerText = 'PERMISSION granted!'

                    bg.on_new_permissions('youtube')

//                    bg.postMessage("granted all permissions",bg.location.origin)
		    console.log('permission granted!!!');
	        } else {
                    _gaq.push(['_trackEvent', 'permission-youtube', 'denied']);
                    document.getElementById('info-result').innerText = 'PERMISSION not granted'

//                    bg.postMessage("failed to grant permissions",bg.location.origin)
		    console.log('permission deeeenied!');
	        }
            })
	});
    });

}

function bind_all_permission_upgrade() {
    var btn = document.querySelector('#add-permissions');

    btn.addEventListener('click', function(event) {

	chrome.permissions.request({
	    permissions: [],
	    origins: ["<all_urls>"]
	}, function(granted) {

            get_background( function() {

	        // The callback argument will be true if the user granted the permissions.
	        if (granted) {
                    _gaq.push(['_trackEvent', 'permission-all_urls', 'granted']);
                    document.getElementById('info-result').innerText = 'PERMISSION granted!'

                    bg.on_new_permissions()

//                    bg.postMessage("granted all permissions",bg.location.origin)
		    console.log('permission granted!!!');
	        } else {
                    _gaq.push(['_trackEvent', 'permission-all_urls', 'denied']);
                    document.getElementById('info-result').innerText = 'PERMISSION not granted'

//                    bg.postMessage("failed to grant permissions",bg.location.origin)
		    console.log('permission deeeenied!');
	        }
            })
	});
    });
}


document.addEventListener("DOMContentLoaded", function() {
    bind_all_permission_upgrade()
    bind_youtube_permission_upgrade()
    bind_channel_button()
    track_button_clicks()
})
