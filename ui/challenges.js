/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Список соревнований',
        challenges: _.sortBy(require('../data').get('challenges'), function (ch) { return -ch.index; })
    }
});