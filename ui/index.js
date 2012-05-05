/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Главная страница'
    },

    onInit: function () {
        this.data.currentChallenge = _.max(require('../data').get('challenges'), function (ch) { return ch.index });
    }
});

module.exports.onClient = function () {
    /*$(function () {
        var logo = createWidget('logo');
        logo.renderTo($('#logo2'));
    });*/
}
