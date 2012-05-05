"use strict";

(function () {

    var context = this;

    var lib = {
        'underscore': { exports: this._ },
        'deferred': { exports: this.deferred },
        'path': {
            exports: {
                resolve: function (from, to) {
                    return mod_path(from + '/', './' + to);
                }
            }
        },
        'fs': {
            exports: {
                readFileSync: function (fn) {
                    return sources[fn];
                }
            }
        },
        'data': {
            exports: {
                get: function() { return []; }
            }
        }
    };

    var sources;

    function mod_path(from, to) {
        var adds = to.split('/');
        var cur;
        if (to.indexOf('.') == 0) {
            cur = from.split('/'); // relative
            cur.pop();
        } else {
            cur = []; // absolute;
        }
        for (var i = 0, l = adds.length; i < l; ++i) {
            if (adds[i] == '.') continue;
            else if (adds[i] == '..') cur.pop();
            else cur.push(adds[i]);
        }
        return cur.join('/');
    }

    function require_for(name) {
        return function (req) {
            return resolve(mod_path(name, req));
        }
    }

    function resolve(name) {
        if (name.slice(-3) === '.js')
            name = name.substr(0, name.length - 3);
        if (name in lib) {
            return lib[name].exports;
        } else {
            lib[name] = { exports: { } };
            if (name in sources) {
                sources[name].call(context, require_for(name), lib[name], lib[name].exports, mod_path(name, '.'));
            }
            return lib[name].exports;
        }
    }

    context.require = resolve;

    return function(_sources) {
        sources = _sources;
        /*for (var name in sources) {
            if (name !== '') resolve(name);
        }
        sources = null;*/
    }

}).call(this)