/// <reference path="../view.js" />

var utils = require('../../utils'),
    Bot = require('../../models/bot'),
    _ = require('underscore');

exports = module.exports = require('../view').subclass({
    onRender: function () {
        var me = this;
        var scoresPromise = utils.isClient() ?
            qget('getUserScores') :
            exports.getUserScores();
        return scoresPromise.then(function (res) {
            me.data.scores = res;
        });
    }
});

exports.getUserScores = function () {
    return utils.cache('user_scores', function () {
        return Bot.mapReduce(function map() {
            emit(this.author, {name: this.authorName, score: this.score, date: this.submitDate, challenge: this.challenge});
        }, function reduce(key, data) {
            var res = {};
            var name, score = 0;
            data.forEach(function (it) {
                if (!res[it.challenge]) res[it.challenge] = { score: 0 };
                if (!res[it.challenge].date || it.date > res[it.challenge].date) { name = it.name; res[it.challenge].score = it.score; res[it.challenge].date = it.date }
            });
            for (var challenge in res) {
                score += res[challenge].score;
            }
            return { name: name, score: score };
        }, {
            query: { score: { $gte: 0 } }
        })
        .map(function (it) {
            return {
                id: it._id.toString(),
                name: it.value.name,
                score: it.value.score
            }
        })
        .then(function (res) {
            return _.sortBy(res, function (doc) { return -doc.score; });
        })
        .map(function (row, i) {
            return {
                place: (i + 1) + '.',
                name: row.name,
                score: row.score
            }
        })
    });
}