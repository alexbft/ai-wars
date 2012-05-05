var utils = require('../utils'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore');

var cache = {};

var initData = {
    news: function (obj) {
        obj.forEach(function (post) {
            post.text = post.text.trim().replace(/\n/g, '<br />');
        });
    },

    challenges: function (obj) {
        _.each(obj, function (ch) {
            ch.text = ch.text.trim().replace(/\n/g, '<br />');
        });
    }
}

exports.get = function(name) {
    if (utils.debug || !cache[name]) {
        var src = fs.readFileSync(path.resolve(__dirname, name + '.json')).toString();
        src = src.replace(/'''([^]*?)'''/gm, function(str, content) {
            return JSON.stringify(content);
        });
        var res = (new Function('return ' + src))();
        if (typeof res == "object") {
            for (var i in res) res[i].id = i;
        }
        if (name in initData) {
            initData[name](res);
        }
        cache[name] = res;
    }
    return cache[name];
}