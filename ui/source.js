/// <reference path="./view.js" />
var Bot = require('../models/bot'),
    utils = require('../utils'),
    InternalError = utils.InternalError;

exports = module.exports = require('./view').subclass({
    onInit: function() {
        this.needAdmin();
    },

    onRender: function () {
        var me = this;
        return Bot.p_findById(this.req.params[0]).then(function (bot) {
            if (!bot) throw new InternalError("Bot not found", 404);
            me.data.bot = bot;
            me.data.title = utils.format("Source code: {0}", bot.fullName());
        });
    }
});