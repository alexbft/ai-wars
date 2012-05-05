/// <reference path="../view.js" />

var url = require('url'),
    _ = require('underscore');

exports = module.exports = require('../view').subclass({
    onInit: function () {
        this.data.challenges = require('../../data').get('challenges');
    }
});

function hashChanged() {
    var hash = (location.hash || '').substr(1);
    $('.challenges_menu').trigger('change', hash);
}

exports.onClient = function () {
    window.onhashchange = hashChanged;
    setTimeout(hashChanged, 0);
}