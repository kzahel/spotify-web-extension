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
function $(id) { return document.getElementById(id); }

function onload() {
    bg.remotes.list( function(devices) {
        $('devices').innerText = JSON.stringify(devices)
    });
}

document.addEventListener("DOMContentLoaded", function() {
    get_background( function() {
        onload()
    })
})


