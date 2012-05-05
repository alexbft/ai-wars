/// <reference path="node_modules/underscore/underscore.js" />
/// <reference path="node_modules/whiskers/lib/whiskers.js" />
/// <reference path="public/js/deferred.js" />
/// <reference path="_vs_/jquery-debug.js" />

var __dirname = '';
var __filename = '';

var vs_intel = {
    underscore: _,
    whiskers: whiskers,
    deferred: deferred
};

function require(name) {
    return vs_intel[name.substr(name.indexOf('/') + 1)];
}