function restore() {
    chrome.runtime.sendMessage({
        action: "RESTORE_CONFIG"
    }, function(response) {
        document.getElementById("config").value = response;
    });
}

function save() {
    chrome.runtime.sendMessage({
        action: "SAVE_CONFIG",
        config: document.getElementById("config").value
    }, function(response) {
        var color;
        if (response === "SUCCESS") {
            color = "";
        } else {
            color = "#ffbbbb";
        }
        document.getElementById("config").style.backgroundColor = color;
    });
}

function throttle(func, delay) {
    var timeoutID = null;
    function wrappedFunc() {
        timeoutID = null;
        func();
    }
    return function() {
        if (timeoutID !== null) {
            window.clearTimeout(timeoutID);
        }
        timeoutID = window.setTimeout(wrappedFunc, delay);
    };
}

var throttledSave = throttle(save, 250);
document.addEventListener("DOMContentLoaded", restore);
document.getElementById("config").addEventListener("input", throttledSave);
