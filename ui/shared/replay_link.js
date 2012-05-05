/// <reference path="../view.js" />

exports = module.exports = require('../view').subclass();

exports.onClient = function () {
    $('.view_replay').die('click').live('click', function (ev) {
        ev.preventDefault();
        var $this = $(this);
        var chId = $this.data('challenge');
        var challenge = require('challenges/' + chId);
        qget('getReplay', { match: $this.data('match') }).then(function (replayJSON) {
            var replay = JSON.parse(replayJSON);
            return showModal('arena', { it: challenge, id: chId, title: $this.data('name'), replay: replay, botNames: $this.data('botNames'), mode: 'replay' });
        }).end();
    });
}