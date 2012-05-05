/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

exports = module.exports = View.subclass({
    data: {
        title: 'AI WARS - Лучшие результаты',
    }
});

exports.onClient = function () {
    $('.challenges_menu').change(function (ev, hash) {
        $('#col_right').empty();
        if (hash) {
            createWidget('challenge_scores', { title: 'Результаты соревнования', subtitle: $('#' + hash).data('name'), id: hash })
            .renderTo($('#col_right'));
        }
    });
}