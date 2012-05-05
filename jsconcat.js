/// <reference path="vs_intel.js" />
/// <reference path="utils.js" />
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var whiskers = require('whiskers');
var deferred = require('deferred');

var utils = require('./utils');

var readdir = deferred.promisify(fs.readdir);
var readFile = deferred.promisify(fs.readFile);

var templ, clientJs;

function getTemplate() {
    if (!templ) {
        return deferred(readFile(path.resolve(__dirname, 'templates/jsconcat_template.whiskers'))
        .then(function (res) {
            templ = whiskers.compile(res.toString());
        }), readFile(path.resolve(__dirname, 'templates/jsconcat_client.js'))
        .then(function (res) {
            clientJs = res.toString();
        }));
    } else {
        return deferred(true);
    }
}

module.exports = function (dirs, files) {
    var list;
    return getTemplate()
    .then(function () {
        return deferred.map(dirs, function (dir) {
            return readdir(path.resolve(__dirname, dir)).invoke('filter', function (fn) {
                return fn.slice(-3) === '.js' || (dir == 'ui/shared' && fn.slice(-5) === '.html');
            });
        })
    })
    .then(function (rs) {
        list = _.flatten(_.map(_.zip(dirs, rs), utils.match(function (dir, files) {
            return _.map(files, function (fn) {
                return dir + '/' + fn;
            });
        })), true).concat(files);
        return deferred.map(_.map(list, function (fn) {
            return path.resolve(__dirname, fn);
        }), readFile);
    })
    .then(function (rs) {
        var res = _.map(_.zip(list, rs), utils.match(function (name, src) {
            src = src.toString();
            if (src.charCodeAt(0) == 65279) {
                src = src.substr(1);
            }
            var res = { };
            if (name.slice(-3) === '.js') {
                res.name = name.substr(0, name.length - 3);
                res.isScript = true;
                res.src = src;
            } else {
                res.name = name;
                res.isScript = false;
                res.src = JSON.stringify(src);
            }
            return res;
        }));
        //console.log(res);
        return clientJs + templ({ files: res });
    });
}