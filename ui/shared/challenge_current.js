/// <reference path="../view.js" />

var utils = require('../../utils'),
    Bot = require('../../models/bot'),
    _ = require('underscore');

exports = module.exports = require('../view').subclass({
    onRender: function () {
        var me = this;
        var scoresPromise = utils.isClient() ?
            qget('getScores', {challenge: me.data.id}) :
            exports.getScores(me.data.id);
        return scoresPromise.then(function (res) {
            me.data.scores = res;
        });
    }
});

exports.getScores = function (challengeId) {
    return utils.cache({ scores: challengeId }, function () {
        return Bot.groupMax('author', 'submitDate', {
            query: { challenge: challengeId }
        })
        .then(function (res) {
            return _.sortBy(res, function (doc) { return -doc.score; });
        })
        .map(function (row, i) {
            return {
                place: (i + 1) + '.',
                name: utils.format('{0} ({1})', row.name, row.authorName),
                submitDate: utils.formatDateTime(row.submitDate),
                score: (row.score == -1 ? 'N/R' : row.score)
            }
        })
    });
}