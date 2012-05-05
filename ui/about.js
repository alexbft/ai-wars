/// <reference path="./view.js" />

exports = module.exports = require('./view').subclass({
    data: {
        title: 'AI WARS - О проекте'
    }
});

exports.onClient = function () {
    $('form').submit(function (ev) {
        ev.preventDefault();
        var text = $('#text').val();
        if (!text) {
            showMessage('Вы ничего не написали в сообщении!', 'Ошибка');
        } else {
            qpost('feedback', { name: $('form #name').val(), email: $('form #email').val(), text: $.trim(text) }).then(function () {
                showMessage('Ваше сообщение успешно доставлено. Спасибо за отзыв!', null, function () {
                    go('/');
                });
            });
        }
    });
}