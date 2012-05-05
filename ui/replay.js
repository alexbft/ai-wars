/// <reference path="./view.js" />
var utils = require('../utils'),
    Match = require('../models/match');

exports = module.exports = require('./view').subclass({
    onRender: function () {
        var me = this;
        return Match.findById(this.req.params[0], Match.replayFields)
        .populate('contest', ['challenge'])
        .run().asDeferred()
        .then(function (match) {
            if (!match)
                throw new utils.InternalError('Replay not found', 404);
            me.data.match = match;
            me.data.title = utils.format("Replay: {0}", match.name);
            me.data.challengeId = match.contest.challenge;
        });
    }
});