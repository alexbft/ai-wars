var path = require('path'),
    utils = require('../utils'),
    fs = require('fs'),
    deferred = require('deferred'),
    less = require('less');

var p_readdir = deferred.promisify(fs.readdir),
    p_readFile = deferred.promisify(fs.readFile),
    p_writeFile = deferred.promisify(fs.writeFile),
    p_render = deferred.promisify(less.render);

var cached = false,
    resFile = path.resolve(__dirname, '../public/css/styles.css');

module.exports = function (req, res, next) {
    if (!cached || !path.existsSync(resFile)) {
        var cssDir = path.resolve(__dirname, '../css');
        p_readdir(cssDir).map(function (fn) { return path.resolve(cssDir, fn); })
        .then(function (list) {
            return deferred.map(list, p_readFile);
        })
        .then(function (contents) {
            return p_render(contents.join('\n'));
        })
        .then(function (r) {
            cached = true;
            return p_writeFile(resFile, r);
        }).then(next, next);
    } else {
        next();
    }
}