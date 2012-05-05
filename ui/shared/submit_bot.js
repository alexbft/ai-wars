/// <reference path="../view.js" />

var utils = require('../../utils');

var challenge, challengeId;

function submit() {
    var name = $('.submit_bot_form #name').val();
    var src = $('.submit_bot_form #code').val();
    try {
        if ($.trim(src) == '') {
            throw new Error('Заполните поле "Код".');
        }
        var ok = true;
        $('#code1 option').each(function () {
            if ($(this).val() != "new") {
                if ($.trim($(this).data('code')) == $.trim(src)) {
                    return (ok = false);
                }
            }
        });

        if (!ok) {
            throw new Error("Ваш код совпадает с одним из примеров!");
        }
        var bot = challenge.getBot(src);
        var state = new challenge.State();
        state.initBots([bot]);
        state.getStep([bot, bot]);
    } catch (e) {
        showMessage(e.message, 'Ошибка');
        return false;
    }

    qget('botNameCheck', { challengeId: challengeId, name: name }).then(function () {
        qpost('submitBot', { challengeId: challengeId, name: name, src: src }).then(function () {
            go('/challenges/' + challengeId);
        });
    });

    return false;
}

exports = module.exports = require('../view').subclass({
    modal: {
        title: 'Отправить AI на сервер',
        buttons: [
      { text: 'OK', click: submit },
      { text: 'Отмена' }
        ]
    },

    onInit: function (options) {
        utils.assertClient();
        challenge = options.it;
        challengeId = options.id;
    }
});