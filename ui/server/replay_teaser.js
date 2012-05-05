/// <reference path="../view.js" />
var utils = require('../../utils'),
    Match = require('../../models/match'),
    Contest = require('../../models/contest'),
    _ = require('underscore'),
    deferred = require('deferred');

module.exports = require('../view').subclass({
    onRender: function () {
        var me = this;
        return utils.cache({ replay: me.data.challengeId }, function () {
            return Contest.find({ challenge: me.data.challengeId, rated: true })
            .desc('date')
            .limit(1)
            .run().asDeferred()
            .match(function (contest) {
                if (contest) {
                    var topBots = _.sortBy(Object.keys(contest.scores), function (botId) { return -contest.scores[botId] });
                    return Match.p_findOne({ contest: contest, bots: { $all: [topBots[0], topBots[1]] } }, Match.replayFields);
                }
            })
        }).then(function (match) {
            if (match) {
                me.data.match = match;
            }
        });
    }
});