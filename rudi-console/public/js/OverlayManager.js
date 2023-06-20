"use strict";

/**
 * Module to create a overlay element on the page
 * Overlays created has methods to be shown and hide
 * Provide event handler
 */
var overlayManager = document.createElement('div');
overlayManager.classList.add('overlay_manager');

var style = document.createElement('style');
style.textContent = `
body > div.overlay_manager {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100vh;
    z-index: 2000;
}

body > div.overlay_manager > div.overlay_wrapper {
    display: none;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
}

body > div.overlay_manager > div.overlay_wrapper > * {
    position: absolute !important;
    top: 10em;
    left: 50%;
    transform: translate(-50%);
    width: 70%;
    padding: 1em 2em;
    box-shadow: 0px 0px 3px black;
    background-color: white;
    min-height: 50vh;
}`
overlayManager.appendChild(style);
document.body.appendChild(overlayManager);


/**
 * Add an overlay to the page. This overlay will be displayed on top of the page.
 * @param {Element} overlay an html element that will become the overlay content
 * @param {Boolean} easyClose true by default, close the div when clicking outside the overlay 
 */
function addOverlay(overlay, easyClose = true) {
    var overlayWrapper = document.createElement("div");
    overlayWrapper.setAttribute("class", "overlay_wrapper")
    
    /** Display the overlay */
    overlay.show = function() {
        var vh = document.documentElement.clientHeight;
        var defaultScrollHeight = document.documentElement.scrollHeight;
        var scrollTop = document.documentElement.scrollTop;
        overlayManager.style.display = "block";
        overlayWrapper.style.display = "block";
        var verticalMargin = (vh - overlay.offsetHeight) / 2;
        verticalMargin = Math.max(verticalMargin, 16);
        overlay.style.top = Math.floor(verticalMargin + scrollTop) + "px";
        var scrollHeight = document.documentElement.scrollHeight;
        overlayManager.style.height = (defaultScrollHeight < scrollHeight) ? `calc(8em + ${scrollHeight}px)` : defaultScrollHeight + "px";
        if (overlay.onoverlayshow) overlay.onoverlayshow();
    }

    /** Hide the overlay */
    overlay.hide = function() { 
        overlayManager.style.display = "none";
        overlayWrapper.style.display = "none";
        if (overlay.onoverlayhide) overlay.onoverlayhide();
    }

    if (easyClose) overlayWrapper.onclick = overlay.hide;
    
    overlay.onclick = function(event) { event.stopPropagation(); }
    overlay.wrapper = overlayWrapper;
    overlayWrapper.appendChild(overlay);
    overlayManager.appendChild(overlayWrapper);
    return overlay;
}

/**
 * Remove the overlay from the page
 * @param {Element} overlay 
 */
function removeOverlay(overlay) {
    overlay.wrapper.remove();
}

export default { addOverlay, removeOverlay }