var _ = require('underscore'),
    deferred = require('deferred'),
    utils = require('../utils'),
    need = utils.assertType,
    InternalError = utils.InternalError,
    User = require('../models/user'),
    Bot = require('../models/bot'),
    Contest = require('../models/contest'),
    Match = require('../models/match'),
    Feedback = require('../models/feedback'),
    ObjectId = require('../db').ObjectId;

var p_gzip = deferred.promisify(require('zlib').gzip);
var p_gunzip = deferred.promisify(require('zlib').gunzip);

var services = module.exports = {
    isGoodLogin: function (login) {
        need(login, String);
        var login_lc = login.toLowerCase();
        if (!(/[a-zа-я0-9_ ]{3,}/.test(login_lc))) {
            throw new InternalError("Invalid login");
        }
        return User.p_count({ login_lc: login_lc })
        .then(function (num) {
            if (num > 0)
                throw new InternalError("Login already exists");
        });
    },

    register: function (q, req, res) {
        need(q, { login: String(50), pass: String });
        var u;
        return services.isGoodLogin(q.login).then(function (isGood) {
            u = new User({ login: q.login, pass: utils.md5(q.pass) });
            return u.p_save();
        }).then(function () {
            req.session.userId = u.id;
            req.session.clearAuth = true;
            return true;
        });
    },

    logout: function (_, req, res) {
        req.session.userId = null;
        req.session.clearAuth = true;
    },

    login: function (q, req, res) {
        need(q, { login: String, pass: String });
        var login_lc = q.login.toLowerCase();
        return User.p_findOne({ login_lc: login_lc, pass: utils.md5(q.pass) })
        .then(function (u) {
            if (u) {
                req.session.userId = u.id;
                req.session.clearAuth = false;
                return true;
            } else {
                throw new InternalError("Invalid user name or password");
            }
        });
    },

    botNameCheck: function (q, req) {
        needAuth(req);
        return botNameCheck(req.query, req);
    },

    submitBot: function (q, req) {
        needAuth(req);
        need(q, { challengeId: String(50), name: String(50), src: String });
        if (q.src.length > 20000)
            throw new InternalError("Source code too large!");
        if (!require('../data').get('challenges')[q.challengeId]) {
            throw new InternalError("Challenge " + q.challengeId + " not found!");
        }
        return botNameCheck(q, req)
        .then(function () {
            var b = new Bot({
                author: req.user,
                authorName: req.user.login,
                challenge: q.challengeId,
                name: q.name,
                src: q.src
            });
            return b.p_save().then(function () {
                utils.clearCache({ scores: q.challengeId });
            });
        });
    },

    botName: function (q, req) {
        return Bot.findOne({ author: req.user }, ['name']).desc('submitDate').limit(1).run().asDeferred().then(function (bot) {
            return bot ? bot.name : '';
        });
    },

    startContest: function (q, req) {
        var contest;

        needAdmin(req);
        need(q, { bots: [String], rated: Boolean, challengeId: String });
        return Bot.p_find({ _id: { $in: q.bots }, challenge: q.challengeId }, ['name', 'authorName'])
        .then(function (bots) {
            if (bots.length < 2) throw new InternalError("Not enough bots!");
            contest = new Contest({
                challenge: q.challengeId,
                rated: q.rated,
                scores: {}
            });
            return contest.p_save().then(function () { return bots; });
        })
        .then(function (bots) {
            bots = utils.dict(bots, '_id');
            var botIds = _.shuffle(_.keys(bots));
            var replays = [];
            var pairs = [];
            for (var i = 0; i < botIds.length; ++i)
                for (var j = i + 1; j < botIds.length; ++j)
                    pairs.push([botIds[i], botIds[j]]);
            return deferred.map(pairs, function (pair) {
                var bot1 = bots[pair[0]];
                var bot2 = bots[pair[1]];
                return Match.p_create({
                    name: utils.format('{0} vs {1}', bot1.fullName(), bot2.fullName()),
                    bots: pair,
                    botNames: [bot1.name, bot2.name],
                    contest: contest
                });
            })
          .then(function () {
              return contest._id.toString();
          });
        });
    },

    getMatchSources: function (q, req) {
        needAdmin(req);
        var matchId = req.query.match;
        return Match.findById(matchId, ['bots'])
        .populate('bots', ['src'])
        .run().asDeferred()
        .then(function (match) {
            if (!match) throw new InternalError("Match not found");
            return _.pluck(match.bots, 'src');
        });
    },

    updateMatch: function (q, req) {
        needAdmin(req);
        need(q, { match: String, replay: String, winner: Number });
        return Match.p_findById(q.match)
        .then(function (match) {
            if (!match) throw new InternalError("Match not found");
            return p_gzip(q.replay).then(function (replayZip) {
                return [match, replayZip];
            });
        }).match(function (match, replayZip) {
            console.log(utils.format('Replay len: {0} zipped: {1}', q.replay.length, replayZip.length));
            match.replay = replayZip;
            match.result = q.winner;
            return match.p_save().then(function () {
                return utils.select(match, ['name', 'challenge', 'result', 'id', 'botNames']);
            });
        });
    },

    getReplay: function (q, req) {
        return Match.p_findById(req.query.match, ['replay']).then(function (match) {
            if (!match) throw new InternalError("Match not found");
            Match.p_update({ _id: match._id }, { $inc: { 'replayViews': 1 } });
            return p_gunzip(match.replay).then(function (res) {
                return res.toString();
            });
        });
    },

    finishContest: function (q, req) {
        needAdmin(req);
        need(q, { contest: String });
        return Match.p_find({ contest: q.contest }, ['bots', 'result'])
        .then(function (matches) {
            var scores = {};
            function addScore(id, val) {
                scores[id] || (scores[id] = 0);
                scores[id] += val;
            }
            _.each(matches, function (match) {
                if (match.result > 0) {
                    _.each(match.bots, function (botId) {
                        addScore(botId, 0); // to mark bots which did not gain any points, but participated nonetheless.
                    });
                    addScore(match.bots[match.result - 1], match.bots.length);
                } else if (match.result === 0) {
                    _.each(match.bots, function (botId) {
                        addScore(botId, 1);
                    });
                }
            });
            return Contest.p_findById(q.contest).then(function (contest) {
                console.log(scores);
                contest.scores = scores;
                contest.finished = true;
                if (contest.rated) {
                    var actions = [contest.p_save()];
                    actions = actions.concat(_.map(scores, function (score, bot) {
                        console.log(utils.format('Setting: {0} = {1}', bot, score));
                        return Bot.p_update({ _id: bot }, { $set: { score: score } });
                    }));
                    return deferred.apply(undefined, actions).then(function () {
                        utils.clearCache({ scores: contest.challenge });
                        utils.clearCache({ top_scores: contest.challenge });
                        utils.clearCache({ replay: contest.challenge });
                        utils.clearCache({ replays: contest.challenge });
                        utils.clearCache('user_scores');
                    });
                } else {
                    return contest.p_save();
                }
            }).then(function () { return true; });
        });
    },

    replaysList: function (q, req) {
        return utils.cache({ replays: q.challenge }, function () {
            return Contest.find({ challenge: q.challenge, rated: true })
            .desc('date')
            .limit(1)
            .run().asDeferred()
            .match(function (contest) {
                return Match.p_find({ contest: contest, result: { $ne: -1 } }, Match.replayFields.concat('replayViews'))
            })
            .map(function (match) {
                return match.toObject();
            })
        });
    },

    getScores: function (q, req) {
        return require('../ui/shared/challenge_scores').getScores(q.challenge);
    },

    feedback: function (q, req) {
        need(q, {name: String(50), email: String(100), text: String(1000)});
        return Feedback.p_create({
            name: q.name,
            email: q.email,
            text: q.text,
            user: req.user && req.user.login
        }).then(function () { });
    }

};

function botNameCheck(q, req) {
    var name = q.name;
    if (name.length < 3) {
        return deferred(new InternalError("Invalid name"));
    }
    return Bot.p_count({ name: q.name, challenge: q.challengeId, author: { $ne: req.user._id } })
      .then(function (num) {
          if (num > 0)
              throw new InternalError("Name already exists");
          return null;
      });
}

function needAuth(req) {
    if (!req.user)
        throw new InternalError("User authentication required");
}

function needAdmin(req) {
    needAuth(req);
    if (!req.user.admin)
        throw new InternalError("Access denied");
}