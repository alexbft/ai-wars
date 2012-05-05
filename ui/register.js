/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Регистрация нового пользователя'
    }
});

module.exports.onClient = function () {
    $('form input:first').focus();
    $('form').submit(function (ev) {
        ev.preventDefault();
        if ($('.register_form #pass').val() != $('.register_form #pass2').val()) {
            showMessage('Пароли не совпадают', 'Ошибка');
        } else {
            qpost('register', { login: $('.register_form #login').val(), pass: $('.register_form #pass').val() }).then(function (res) {
                var dest = window.referer || '/';
                go(dest);
            });
        }
    });
}