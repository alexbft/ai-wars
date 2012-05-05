/// <reference path="../view.js" />

var login = exports.login = function () {
    qpost('login', { login: $('.login_form #login').val(), pass: $('.login_form #pass').val() }).then(function () {
        if (window.referer) {
            go(referer);
        } else {
            location.reload();
        }
    });
    return false;
}

exports = module.exports = require('../view').subclass({
    modal: {
        buttons: [
            { text: 'Вход', click: login }
        ]
    }
});