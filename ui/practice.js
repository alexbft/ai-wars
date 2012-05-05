/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore'),
    Bot = require('../models/bot');

var challengeId;

exports = module.exports = View.subclass({
    onInit: function () {
        challengeId = this.req.params[0];
        this.data.it = require('../data').get('challenges')[challengeId];
        if (!this.data.it) {
            throw new utils.InternalError('Соревнование не найдено', 404);
        }
        this.data.title = utils.format('AI Challenge: {0} - Тренировка', this.data.it.name);
        this.data.code = this.data.it.code;
        this.data.selId = this.data.it.sampleCodeId;
    },

    onRender: function () {
        if (!this.req.user) return false;
        var me = this;
        return Bot.find({ author: this.req.user, challenge: challengeId }, ['name', 'src'])
        .desc('submitDate')
        .limit(1)
        .run().asDeferred()
        .match(function (bot) {
            if (bot) {
                me.data.code = me.data.code.concat([[bot.name, bot.src]]);
                me.data.selId = me.data.code.length - 1;
            }
        });
    }
});

exports.onClient = function () {
    $('#start_practice').click(function () {
        var botSrc = _.map($('.code_editor'), function (el) {
            return $(el).data('editor').getValue();
        });
        showModal('arena', { it: require('challenges/' + challengeIdClient), id: challengeIdClient, title: 'Тренировочная игра', botSrc: botSrc, mode: 'practice' });
    });
    if (!user) {
        $('#submit_bot').click(function () {
            $('.userinfo #login').click();
        });
    } else {
        $('#submit_bot').click(function () {
            showModal('submit_bot', { it: require('challenges/' + challengeIdClient), id: challengeIdClient, src: $('#code1').data('editor').getValue() });
        });
    }
}