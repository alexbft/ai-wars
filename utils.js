if (this.vs_intel) exports = vs_intel.utils = {};

var _ = require('underscore'),
  crypto = require('crypto'),
  deferred = require('deferred');

exports.debug = false;

var Class = exports.Class = function (Ancestor, proto) {
    /// <signature>
    /// <summary>Объявление класса. Метод init будет вызван в конструкторе.</summary>
    /// <param name="proto" type="Object">Прототип.</param>
    /// </signature>
    /// <signature>
    /// <summary>Объявление класса. Метод init будет вызван в конструкторе.</summary>
    /// <param name="Ancestor" type="Object">Класс для наследования.</param>
    /// <param name="proto" type="Object">Прототип.</param>
    /// </signature>
    if (typeof proto == "undefined") {
        proto = Ancestor;
        Ancestor = null;
    }
    var res = function () {
        this.constructor = res;
        if (this.init) {
            this.init.apply(this, arguments);
        } else if (this.super) {
            this.super.apply(this, arguments);
        }
    }
    res.prototype = proto;
    if (Ancestor !== null) {
        res.prototype.super = Ancestor;
        res.prototype.callSuper = function (method, args) {
            args = Array.prototype.slice.call(arguments, 1);
            return this.super.prototype[method].apply(this, args);
        }
        res.prototype.__proto__ = Ancestor.prototype;
    }
    return res;
}

// Форматирует строку.
// msg - строка для форматирования с плейсхолдерами {0}, {1}, итд
// ... - параметры.
var format = exports.format = function (msg, args) {
    if (typeof args != "object")
        args = _.rest(arguments);
    return msg.replace(/\{(.+?)\}/g, function (_, id) {
        if (id && id.charAt(0) == '{') {
            // например, строка {{nya}}
            // в id - {nya
            // заменяем {{nya}
            // результат - {nya}
            return id;
        }
        else {
            return args[id] === null ? '' : args[id];
        }
    });
}

var Library = exports.Library = Class({
    init: function () {
        this.items = {};
    },
    extend: function (items) {
        var me = this;
        _.each(items, function (it, id) {
            it.prototype.id = id;
            if (it.prototype.initLibrary) it.prototype.initLibrary(this);
            me.items[id] = it.prototype;
        });
        _.extend(this, items);
    },
    get: function (id) {
        return this[id].prototype;
    }
});

var random = exports.random = function (x) {
    return _.isArray(x) ?
        x[random(x.length)] :
        Math.floor(Math.random() * x);
}

var deepcopy = exports.deepcopy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
}

var match = exports.match = function (func) {
    /// <summary>Декоратор для функции. Матчит массив, переданный на вход, в аргументы функции.</summary>
    /// <param name="func" type="Function">Функция</param>
    /// <returns type="Function" />
    return function (arr) {
        return func.apply(this, arr);
    }
}

var startswith = exports.startswith = function (s, key) {
    return s.slice(0, key.length) === key;
}

var now = exports.now = function () {
    return (new Date()).getTime();
}

exports.require = function (req, mod) {
    if (exports.debug && req.cache) {
        var mod_file = req.resolve(mod);
        if (mod_file in req.cache) {
            delete req.cache[mod_file];
        }
    }
    return req(mod);
}

var InternalError = exports.InternalError = Class(Error, {
    init: function (msg, code) {
        this.message = msg;
        if (code) this.code = code;
    },

    toString: function () {
        return this.message;
    }
});

var md5 = exports.md5 = function (s) {
    var hash = crypto.createHash('md5');
    var secret = require('./server').md5Secret;
    hash.update(s + secret);
    return hash.digest('hex');
}

var Any = exports.Any = {};

var assertType = exports.assertType = function (obj, schema) {
    var param = '(data)';
    function check(obj, schema) {
        if (typeof schema == "string") {
            return typeof obj === "string" && obj.length <= Number(schema);
        }
        else if (schema === String) return typeof obj === "string";
        else if (schema === Number) return typeof obj === "number";
        else if (schema === Boolean) return typeof obj === "boolean";
        else if (schema === Any) return (typeof obj !== "undefined");
        else if (_.isArray(schema)) {
            return _.isArray(obj) && _.all(obj, function (it) { return check(it, schema[0]); });
        }
        else {
            return _.isObject(obj) && _.all(schema, function (it, key) { param = key; return check(obj[key], it); });
        }
    }
    if (!check(obj, schema)) {
        throw new InternalError('Invalid parameter type for: ' + param);
    };
}

var clamp = exports.clamp = function (num, min, max) {
    if (num < min) return min;
    else if (num > max) return max;
    else return num;
}

var mySetInterval = exports.setInterval = function (fn, interval) {
    var timer = setInterval(function () {
        try {
            if (fn() === false) {
                clearInterval(timer);
            }
        } catch (e) {
            clearInterval(timer);
            throw e;
        }
    }, interval);
    return timer;
}

exports.setRepeated = function (fn, interval) {
    var timer;
    function setTimer() {
        timer = setTimeout(repeatFunc, interval);
    }
    function repeatFunc() {
        if (fn() !== false)
            setTimer();
    }
    setTimer();
    return {
        stopped: false,
        stop: function () {
            if (!this.stopped) {
                clearTimeout(timer);
                this.stopped = true;
            }
        },
        resume: function () {
            if (this.stopped) {
                setTimer();
                this.stopped = false;
            }
        }
    };
}

var isClient = exports.isClient = function () {
    return typeof window !== "undefined";
}

var assertClient = exports.assertClient = function () {
    if (!isClient())
        throw new Error("This code should be run on client only.");
}

var month_names = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
var formatDate = exports.formatDate = function (date) {
    return format('{day} {month} {year} г.', { day: date.getDate(), month: month_names[date.getMonth()], year: date.getFullYear() });
}

var padZero = exports.padZero = function (x) {
    return x < 10 ? '0' + x : '' + x;
}

exports.formatDateTime = function (date) {
    var now = new Date();
    var dateStr;
    if (now.toDateString() == date.toDateString())
        dateStr = "Сегодня";
    else if (now.getFullYear() == date.getFullYear())
        dateStr = format('{day} {month}', { day: date.getDate(), month: month_names[date.getMonth()] });
    else
        dateStr = formatDate(date);
    return format('{date}, {h}:{m}', { date: dateStr, h: date.getHours(), m: padZero(date.getMinutes()) });
}

exports.deferredHelper = function (d) {
    return function (err, args) {
        if (err) {
            d.resolve(err);
        } else {
            args = _.rest(arguments);
            d.resolve.apply(d, args);
        }
    }
}

var getter = exports.getter = function (fieldName) {
    return function (obj) {
        return obj[fieldName];
    }
}

exports.dict = function (arr, keySelector) {
    if (typeof keySelector !== "function")
        keySelector = getter(keySelector);
    return _.reduce(arr, function (res, it) { res[keySelector(it)] = it; return res; }, {});
}

exports.select = function (obj, fields) {
    var res = {};
    _.each(fields, function (field) {
        res[field] = obj[field];
    });
    return res;
}

var cacheStore = {};
var cacheStoreTime = 300000;

exports.cache = function (key, func) {
    key = JSON.stringify(key);
    var data = cacheStore[key];
    var cur = now();
    if (data && data.time >= cur) {
        return data.value;
    } else {
        cacheStore[key] = { time: cur + cacheStoreTime, value: deferred(func()) };
        return cacheStore[key].value;
    }
}

exports.clearCache = function (key) {
    key = JSON.stringify(key);
    if (key in cacheStore) {
        delete cacheStore[key];
    }
}