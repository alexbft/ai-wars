var path = require('path');
var jsconcat = require('../jsconcat');
var utils = require('../utils');
var fs = require('fs');
var deferred = require('deferred');

var cached = false;
var resFile = path.resolve(__dirname, '../public/js/scripts.js');
var p_writeFile = deferred.promisify(fs.writeFile);

module.exports = function (req, res, next) {
    if (!cached || !path.existsSync(resFile)) {
        console.log('Creating scripts...');
        jsconcat(['ui', 'ui/server', 'ui/shared', 'challenges'], ['utils.js', 'template.js', 'client.js']).then(function (r) {
            cached = true;
            p_writeFile(resFile, r).then(function () {
                console.log('okay');
                next();
            }, next);
            //res.send(r, { 'Content-Type': 'text/javascript' });
        }).end();
    } else {
        next();
    }
}