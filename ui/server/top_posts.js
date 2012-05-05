/// <reference path="../view.js" />
var _ = require('underscore');

module.exports = require('../view').subclass({
    onInit: function () {
        var news = require('../../data').get('news').slice(0, 2);
        news.reverse();
        this.data.news = news;
    }
});