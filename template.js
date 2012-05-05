/// <reference path="vs_intel.js" />
/// <reference path="utils.js" />
if (this.vs_intel) vs_intel.template = exports = {};

var deferred = require('deferred');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var utils = require('./utils');

var cache = {};

exports.layoutFile = path.resolve(__dirname, 'ui/layout.html');

exports.render = function (fn, data) {
    if (utils.debug || !(fn in cache)) {
        var templ = fs.readFileSync(fn).toString();
        if (templ.charCodeAt(0) == 65279) {
            templ = templ.substr(1);
        }
        cache[fn] = compile(templ, fn);
    }
    return cache[fn](data);
}

var special = {
    'var': '%s',
    'if': '%s{',
    'for ': '%s{',
    'for(': '%s{',
    'while': '%s{',
    'else': '}%s{',
    'end': '}',
    'each': '',
    '/each': '});',
    'once': 'if (_once(_c)) {'
};

var g_once_id = 0;

function make_once(once_id) {
    once_id = once_id || g_once_id++;
    return function (context) {
        var anc = context.me.getAncestor();
        anc.once || (anc.once = {});
        if (!anc.once[once_id]) {
            anc.once[once_id] = true;
            return true;
        } else {
            return false;
        }
    }
}

var compile = exports.compile = function (text, once_id) {
    /// <param name="text" type="String" />

    function addtext(txt) {
        return "_b.push('" + txt.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '') + "');";
    }

    var re = new RegExp('(\{\{@?)([^]+?)\}\}', 'gm');
    var res;
    var parts = [];
    var i = 0;
    while ((res = re.exec(text)) !== null) {
        if (i < res.index) {
            parts.push(addtext(text.substring(i, res.index)));
        }
        var cmd = res[2].trim();
        if (res[1] === '{{@') {
            cmd = 'html(' + cmd + ')';
        }
        var spec = _.find(_.keys(special), function (spec) { return utils.startswith(cmd, spec); });
        if (spec) {
            if (spec === 'each') {
                var g = /^\s*each\s*\(\s*(.*?)\s+in\s+(.*?)\s*\)\s*$/.exec(cmd);
                parts.push(utils.format('_.each({1}, function({0}) {', g[1], g[2]));
            } else {
                parts.push(special[spec].replace('%s', cmd));
            }
        } else {
            parts.push("_b.push(" + cmd + ");");
        }
        i = re.lastIndex;
    }
    if (i < text.length) {
        parts.push(addtext(text.substr(i)));
    }

    var compiled = new Function('_d', '_', 'html', 'json', '_once', 'return function(_c) { function print(s) { _b.push(s); }; var _b = []; with (_c) {' + parts.join('') + '}; return _d(_b); }');
    parts = null;
    re = null;

    return compiled(function (buffer) {
        if (buffer.length) {
            return deferred.apply(undefined, buffer).then(function (buf) {
                return _.isArray(buf) ? buf.join('') : buf;
            });
        } else {
            return deferred('');
        }
    }, _, _.escape, JSON.stringify, make_once(once_id));
}