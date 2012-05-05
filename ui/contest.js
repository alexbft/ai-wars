/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    Contest = require('../models/contest'),
    Match = require('../models/match'),
    _ = require('underscore');

var contestId, challengeId;

exports = module.exports = View.subclass({
    onInit: function () {
        this.needAdmin();
    },

    onRender: function () {
        var me = this;
        contestId = this.req.params[0];
        return Contest.p_findById(contestId).then(function (contest) {
            if (!contest) {
                throw new utils.InternalError('Contest not found', 404);
            }
            me.data.contest = contest;
            challengeId = contest.challenge;
            me.data.challenge = require('../data').get('challenges')[challengeId];
            if (!me.data.challenge) {
                throw new utils.InternalError('Challenge not found', 404);
            }
            me.data.challengeEngine = require('../challenges/' + challengeId);
            me.data.contestDate = utils.formatDateTime(contest.date);
            me.data.title = utils.format('AI Challenge: {0} - Contest {1}', me.data.challenge.name, me.data.contestDate);
            return Match.p_find({ contest: contest }).then(function (matches) {
                me.data.matches = matches;
            });
        });
        /*var me = this;
    return Bot.groupMax('author', 'submitDate', {
    query: { challenge: challengeId }
    }).then(function (res) {
    return _.sortBy(res, function (doc) { return doc.submitDate; });
    }).map(function (row) {
    return {
    name: row.name,
    date: utils.formatDateTime(row.submitDate),
    source: utils.format('<a href="#">View source ({0} bytes)</a>', row.src.length),
    check: utils.format('<input type="checkbox" id="{0}" />', row._id.toString())
    }
    }).then(function (res) {
    me.data.submits = res;
    });*/
    }
});

exports.onClient = function () {
    var challenge = require('challenges/' + challengeIdClient);

    $('.start_match').live('click', function (ev) {
        var $this = $(this);
        var tr = $this.parents('tr:first');
        var progressBar = tr.find('.progressbar').data('it');
        var turns = [];
        var btnContinue = $this.parents('td:first').find('.continue_match');
        var btnStop = $this.parents('td:first').find('.stop_match');
        qget('getMatchSources', { match: $this.data('match') }).then(function (sources) {
            var bots = _.map(sources, challenge.getBot);
            var state = new challenge.State();
            state.initBots(bots);
            progressBar._change.empty();
            progressBar.change(function (cur) {
                if (cur >= challenge.maxTurns) {
                    //alert('Winner: ' + state.winner() + '. Replay length: ' + JSON.stringify(turns).length);
                    qpost('updateMatch', { match: $this.data('match'), replay: JSON.stringify(turns), winner: state.winner() }).then(function (match) {
                        createWidget('match_row', { match: match, maxTurns: challenge.maxTurns, challenge: challengeIdClient })
                        .renderTo(tr, true);
                    });
                }
            });
            var timer = utils.setRepeated(function () {
                var curTurn = state.turn;
                if (curTurn >= challenge.maxTurns)
                    return false;
                turns[curTurn] = state.getStep(bots);
                state.applyStep(turns[curTurn]);
                progressBar.set(state.turn);
            }, 0);
            btnStop.unbind('click').click(function () {
                timer.stop();
                btnStop.hide();
                $this.show();
                btnContinue.show();
            });
            btnContinue.unbind('click').click(function () {
                timer.resume();
                $this.hide();
                btnContinue.hide();
                btnStop.show();
            });
            tr.find('.match_result').hide();
            tr.find('.progressbar_container').show();
            btnContinue.trigger('click');
        });
    });

    $('#finish').click(function () {
        qpost('finishContest', { contest: contestIdClient }).then(function () {
            go(utils.format('/challenges/{0}/contests', challengeIdClient));
        });
    });
}