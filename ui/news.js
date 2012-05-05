/// <reference path="./view.js" />

exports = module.exports = require('./view').subclass({
    data: {
        title: 'AI WARS - Новости'
    },

    onInit: function () {
        var news = require('../data').get('news').slice();
        news.reverse();
        this.data.news = news;
    }
});