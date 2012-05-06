/// <reference path="../view.js" />

var utils = require('../../utils'),
    Contest = require('../../models/contest'),
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
    return utils.cache({ top_scores: challengeId }, function () {
        return Contest.findOne({ challenge: challengeId, rated: true, finished: true }, ['scores'])
        .desc('date')
        .run().asDeferred()
        .then(function (contest) {
            if (!contest) return [];
            var botIds = Object.keys(contest.scores);
            return Bot.find({ _id: { $in: botIds } }).desc('score').run().asDeferred();
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