/// <reference path="vs_intel.js" />
var _ = require('underscore'),
    template = require('./template'),
    deferred = require('deferred');

var createWidget = exports.createWidget = function (name, options) {
    var Widget = require('ui/shared/' + name);
    return new Widget('shared/' + name, name, null, null, null, options);
}

var modalOptionsDefault = {
    buttons: [
        { text: 'OK' }
    ],
    html: ''
};

var back = null;

var showModal = exports.showModal = function (options) {
    if (typeof options == "string") {
        var widgetName = options;
        var widgetOptions = arguments[1] || {};
        widgetOptions.isModal = true;
        var widget = createWidget(widgetName, widgetOptions);
        options = _.extend({}, modalOptionsDefault, widget.getModalOptions());
        return showModal(options).then(function (wnd) {
            return widget.renderTo(wnd.find('.text:first')).then(function () {
                if (!options.nofocus) {
                    wnd.find('.text input:first').focus();
                }
                return wnd;
            });
        }).end();
    }
    options = _.extend({}, modalOptionsDefault, options);
    return template.render('ui/shared/modal.html', options).then(function (res) {
        var frame = $(res);
        var wnd = frame.find('.modal:first');
        var thisBack;
        var clicker = function (num) {
            return function () {
                if (options.buttons[num].click) {
                    var res = options.buttons[num].click.apply(wnd, arguments);
                }
                if (res !== false) {
                    wnd.data('modal').close();
                }
            }
        }
        wnd.data('modal', {
            options: options,
            buttons: [],
            close: function () {
                thisBack.remove();
                frame.remove();
                $(window).unbind('keyup.modal');
                if (options.onClose) {
                    options.onClose.call(wnd);
                }
            },
            click: function (num) {
                return clicker(num)();
            }
        });
        $(window).bind('keyup.modal', function (ev) {
            if (ev.keyCode == 27) {
                wnd.data('modal').close();
            } else if (ev.keyCode == 13) {
                ev.preventDefault();
                clicker(0)();
            }
        });
        if (!back) {
            back = $('<div class="modal_back"></div>');
            back.css('opacity', 0.7);
            back.bind('mousedown mouseup click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            });
        }
        if (!$('body > .modal_back').length) {
            thisBack = back;
        } else {
            thisBack = $('<div></div>');
        }
        $('body').append(thisBack).append(frame);
        wnd.find('.buttons button').each(function () {
            var num = Number($(this).data('num'));
            var $this = $(this);
            wnd.data('modal').buttons[num] = $this;
            $this.click(clicker(num));
        });
        wnd.draggable({ handle: 'h1' });
        if (!options.nofocus) {
            wnd.find('.text input:first').focus();
        }
        return wnd;
    });
}

var activeLocks = {};

function callLock(lock, func) {
    function dellock() {
        delete activeLocks[lock];
    }
    if (activeLocks[lock]) {
        return deferred(new Error('Call already active'));
    } else {
        activeLocks[lock] = true;
        var res = func();
        res.then(dellock, dellock);
        return res;
    }
}

function wrapAjax(func) {
    return function () {
        var res = deferred();
        func().then(function (r) {
            if (r.success) {
                res.resolve(r.result);
            } else {
                res.resolve(new Error(r.error));
            }
        }, function (_, errType, err) {
            res.resolve(new Error(err || errType));
        });
        var pr = res.promise;
        pr.then(null, function (err) {
            showMessage(err.message, 'Ошибка');
            return err;
        });
        return pr;
    }
}

var qpost = exports.qpost = function (service, data) {
    if (typeof data === typeof undefined) data = {};
    return callLock(service, wrapAjax(function () {
        return $.ajax({
            type: 'POST',
            url: '/ajax/' + service,
            data: JSON.stringify(data),
            dataType: 'json',
            contentType: 'application/json'
        });
    }));
}

var qget = exports.qget = function (service, data) {
    return callLock(service, wrapAjax(function () {
        return $.get('/ajax/' + service, data);
    }));
}

exports.logout = function () {
    qpost('logout').then(function () { window.location.reload(); });
}

exports.go = function (where) {
    window.location.href = where;
}

var showMessage = exports.showMessage = function (text, title, ok) {
    return showModal({ html: text, title: title, buttons: [{ text: 'OK', click: ok }] });
}