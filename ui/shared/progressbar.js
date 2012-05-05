/// <reference path="../view.js" />

var utils = require('../../utils'),
    _ = require('underscore');

exports = module.exports = require('../view').subclass({
});

var elHint;

function hint() {
    if (!elHint) {
        elHint = $('<div class="progressbar_hint"></div>').appendTo($('body'));
    }
    return elHint;
}

var ProgressBar = utils.Class({
    current: 0,
    progress: 100,
    max: 100,
    interval: 100,

    init: function (el) {
        var me = this;
        this.el = el;
        this.elFrame = el.find('.progress_frame');
        this.elCur = el.find('#current');
        this.elPro = el.find('#progress');
        this.elMeter = el.find('#meter');
        this.elHint = hint();
        _.extend(this, el.data('it'));
        el.data('it', this);
        this._change = $.Callbacks();
        this.paused = true;
        this.update();
        this.elPro.add(this.elCur).mousedown(function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            me.set(me.calcValue(ev.pageX));
        });
        this.elFrame.hover(function() {
            me.elHint.addClass('visible');
        }, function() {
            me.elHint.removeClass('visible');
        });
        this.elFrame.mousemove(function (ev) {
            me.elHint.css({ left: ev.pageX, top: me.elFrame.offset().top - 20 });
            me.elHint.html(me.calcValue(ev.pageX));
        });
    },

    calcValue: function (x) {
        x = x - this.elFrame.offset().left;
        return Math.round(x / (this.elFrame.width() + 1) * this.max);
    },

    update: function (progress) {
        if (typeof progress !== "undefined")
            this.progress = progress;
        this.current = utils.clamp(this.current, 0, this.max);
        this.progress = utils.clamp(this.progress, 0, this.max);
        var w = this.elFrame.width();
        var wCur = Math.round(this.current / this.max * w);
        var wPro = Math.round(this.progress / this.max * w);
        this.elCur.width(wCur);
        this.elPro.width(wPro);
        this.elMeter.html(utils.format('{0}/{1}', this.current, this.max));
    },

    change: function (fn) {
        if (fn) {
            this._change.add(fn);
        } else {
            this._change.fire(this.current, this.current);
        }
    },

    set: function (newCurrent) {
        var oldCurrent = this.current;
        this.current = newCurrent;
        this._change.fire(this.current, oldCurrent);
        this.update();
    },

    start: function () {
        var me = this;
        if (this.paused) {
            this.timer = utils.setInterval(function () {
                if (me.current < me.max) {
                    if (me.current < me.progress) {
                        me.set(me.current + 1);
                    }
                }
                else {
                    return false;
                }
            }, this.interval);
            this.paused = false;
        }
    },

    stop: function () {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.paused = true;
    }
});

exports.onClient = function () {
    $('.progressbar').each(function () {
        new ProgressBar($(this));
    });
}
