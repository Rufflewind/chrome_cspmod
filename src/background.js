function dropCommentsAndWhitespace(s) {
    var r = "";
    var lines = s.match(/[^\r\n]+/g) || [];
    lines.forEach(function(line) {
        if (line.match(/^\s*#/) !== null ||
            line.match(/^\s*$/) !== null) {
            return;
        }
        r += line + "\n";
    });
    return r;
}

function parseRules(config) {
    config = dropCommentsAndWhitespace(config);
    if (config === "") {
        return [];
    }
    try {
        return JSON.parse(config);
    } catch (_) {
        return null;
    }
}

function validateRules(rules) {
    if (!Array.isArray(rules)) {
        return null;
    }
    var fail = false;
    rules.forEach(function(rule) {
        if (rule.length !== 2 ||
            typeof rule[0] !== "string" ||
            !Array.isArray(rule[1])) {
            fail = true;
            return null;
        }
        rule[1].forEach(function(subrule) {
            if (subrule.length !== 2 ||
                typeof subrule[0] !== "string" ||
                typeof subrule[1] !== "string") {
                fail = true;
                return null;
            }
        });
        if (fail) {
            return null;
        }
    });
    if (fail) {
        return null;
    }
    return rules;
}

function regexpifyRules(newRules) {
    if (newRules === null) {
        return null;
    }
    return newRules.map(function(rule) {
        return [
            new RegExp(rule[0]),
            rule[1].map(function(subrule) {
                return [
                    new RegExp(subrule[0]),
                    subrule[1]
                ];
            })
        ];
    });
}

function processConfig(config) {
    if (typeof config !== "string") {
        config = "";
    }
    return regexpifyRules(validateRules(parseRules(config)));
}

function messageHandler(request, sender, sendResponse) {
    if (request.action === "RESTORE_CONFIG") {
        chrome.storage.sync.get({config: defaultConfig}, function(items) {
            var config = items.config;
            if (typeof config !== "string") {
                config = defaultConfig;
            }
            sendResponse(config);
        });
        return true;
    } else if (request.action === "SAVE_CONFIG") {
        var config = request.config;
        newRules = processConfig(config);
        if (newRules !== null) {
            chrome.storage.sync.set({config: config});
            rules = newRules;
            sendResponse("SUCCESS");
        } else {
            sendResponse("FAILURE");
        }
    } else {
        console.error("Invalid request: ", request);
    }
}

function requestProcessor(details) {
    for (var i = 0, iLen = rules.length; i !== iLen; ++i) {
        if (!rules[i][0].test(details.url)) {
            continue;
        }
        var subrules = rules[i][1];
        var headers = details.responseHeaders;
        for (var j = 0, jLen = headers.length; j !== jLen; ++j) {
            var header = headers[j];
            var name = header.name.toLowerCase();
            if (name !== "content-security-policy" &&
                name !== "x-webkit-csp") {
                continue;
            }
            for (var k = 0, kLen = subrules.length; k !== kLen; ++k) {
                header.value = header.value.replace(subrules[k][0],
                                                    subrules[k][1]);
            }
        }
        return {responseHeaders: headers};
    }
}

var defaultConfig =
    "# Rules need to be in JSON syntax:\n" +
    "#\n" +
    "# [\n" +
    '#     ["url-regexp", [\n' +
    '#         ["pattern-regexp", "replacement-string"],\n' +
    "#         ...\n" +
    "#     ]],\n" +
    "#     ...\n" +
    "# ]\n" +
    "#\n" +
    "# Keep in mind that JSON does not allow trailing commas.\n" +
    "# Lines starting with '#' are ignored.  Have fun!\n" +
    "\n" +
    "[\n" +
    "# Example: whitelisting MathJax on GitHub:\n" +
    '#    ["https://gist\\\\.github\\\\.com", [\n' +
    '#        ["script-src", "script-src https://cdn.mathjax.org"],\n' +
    '#        ["font-src", "font-src https://cdn.mathjax.org"]\n' +
    "#    ]]\n" +
    "]\n";

var rules = []

chrome.storage.sync.get({config: ""}, function(items) {
    newRules = processConfig(items.config);
    if (newRules !== null) {
        rules = newRules;
    }
});
chrome.runtime.onMessage.addListener(messageHandler);
chrome.webRequest.onHeadersReceived.addListener(requestProcessor, {
    urls: ["*://*/*"],
    types: ["main_frame", "sub_frame"]
}, ["blocking", "responseHeaders"]);
