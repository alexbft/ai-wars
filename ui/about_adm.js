/// <reference path="../view.js" />

var utils = require('../utils'),
    Feedback = require('../models/feedback');

exports = module.exports = require('./view').subclass({
    data: {
        title: 'AI WARS - Feedback',
        formatDateTime: utils.formatDateTime
    },

    onRender: function () {
        var me = this;
        return Feedback.find()
        .desc('date')
        .limit(100)
        .run().asDeferred()
        .then(function (res) {
            me.data.messages = res;
        });
    }
});