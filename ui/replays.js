/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

exports = module.exports = View.subclass({
    data: {
        title: 'AI WARS - Реплеи',
    }
});

exports.onClient = function () {
    $('.challenges_menu').change(function (ev, hash) {
        var afterRender = $.noop;
        $('#col_right').empty();
        if (hash) {
            qget('replaysList', { challenge: hash }).map(function (match) {
                match.id = match._id;
                var link = createWidget('replay_link', { match: match, challenge: hash });
                afterRender = _.bind(link.afterRender, link);
                return {
                    link: link.render(),
                    views: utils.format('Просмотров: {0}', match.replayViews)
                };
            }).then(function (rows) {
                var table = createWidget('table', { columns: [{ raw: 'link' }, { id: 'views', cssClass: 'col_last' }], data: rows, title: 'Реплеи', subtitle: $('#' + hash).data('name') });
                table.renderTo($('#col_right')).then(afterRender);
            }).end();
        }
    });
}