
var links = document.querySelectorAll('a[href^="spotify:"]');

for (var i=0; i<links.length; i++) {
    console.log('fucked spotify anchor');
    fuck_anchor(links[i])
}

// select the target node
var target = document.body;
 

function fuck_anchor(tag) {
    tag.href = 'web+spotify://FUCKYOUMOTHERFUCKER' + tag.href
}

function onMutation( record ) {
    
    if (record.addedNodes.length > 0) {
	record.addedNodes.forEach( function(node) {
            if (node.tagName == 'a') {
	        fuck_anchor(node)
            }
	});
    } else if (record.type == 'attributes') {
	// only sends one node
        var node = record.target;
        if (node.tagName == 'a') {
	    fuck_anchor(record.target)
        }
    }
}


// create an observer instance
var observer = new MutationObserver(function(record) {


    record.forEach(function(mutation) {
        console.log('MUTATION', mutation, mutation.type);
    });    





});
 
// configuration of the observer:



var config = {
    childList: true, 
    attributes: false, 
    characterData: false, 
    subtree: true, 
    attributeOldValue: false, 
    characterDataOldValue: false, 
    attributeFilter: ["href"]
};

var config = { attributes: true, 
	       childList: true, 
	       subtree: true,
	       characterData: true,
	       attributeFilter: ["href"]
	     };

// pass in the target node, as well as the observer options

var i = 0

function addone() {
    var a =document.createElement('a');
    a.href="foo"
    a.id="blah" + i
    i++
    document.body.appendChild(a)
}


observer.observe(target, config);

// later, you can stop observing
// observer.disconnect();

window.postMessage("all.inject postmessage","*")