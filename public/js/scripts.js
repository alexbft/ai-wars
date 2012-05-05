"use strict";

(function () {

    var context = this;

    var lib = {
        'underscore': { exports: this._ },
        'deferred': { exports: this.deferred },
        'path': {
            exports: {
                resolve: function (from, to) {
                    return mod_path(from + '/', './' + to);
                }
            }
        },
        'fs': {
            exports: {
                readFileSync: function (fn) {
                    return sources[fn];
                }
            }
        },
        'data': {
            exports: {
                get: function() { return []; }
            }
        }
    };

    var sources;

    function mod_path(from, to) {
        var adds = to.split('/');
        var cur;
        if (to.indexOf('.') == 0) {
            cur = from.split('/'); // relative
            cur.pop();
        } else {
            cur = []; // absolute;
        }
        for (var i = 0, l = adds.length; i < l; ++i) {
            if (adds[i] == '.') continue;
            else if (adds[i] == '..') cur.pop();
            else cur.push(adds[i]);
        }
        return cur.join('/');
    }

    function require_for(name) {
        return function (req) {
            return resolve(mod_path(name, req));
        }
    }

    function resolve(name) {
        if (name.slice(-3) === '.js')
            name = name.substr(0, name.length - 3);
        if (name in lib) {
            return lib[name].exports;
        } else {
            lib[name] = { exports: { } };
            if (name in sources) {
                sources[name].call(context, require_for(name), lib[name], lib[name].exports, mod_path(name, '.'));
            }
            return lib[name].exports;
        }
    }

    context.require = resolve;

    return function(_sources) {
        sources = _sources;
        /*for (var name in sources) {
            if (name !== '') resolve(name);
        }
        sources = null;*/
    }

}).call(this)﻿({



'ui/about': function(require, module, exports, __dirname) {
/// <reference path="./view.js" />

exports = module.exports = require('./view').subclass({
    data: {
        title: 'AI WARS - О проекте'
    }
});

exports.onClient = function () {
    $('form').submit(function (ev) {
        ev.preventDefault();
        var text = $('#text').val();
        if (!text) {
            showMessage('Вы ничего не написали в сообщении!', 'Ошибка');
        } else {
            qpost('feedback', { name: $('form #name').val(), email: $('form #email').val(), text: $.trim(text) }).then(function () {
                showMessage('Ваше сообщение успешно доставлено. Спасибо за отзыв!', null, function () {
                    go('/');
                });
            });
        }
    });
}
}, // end of ui/about



'ui/about_adm': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

var utils = require('../utils'),
    Feedback = require('../models/feedback');

exports = module.exports = require('./view').subclass({
    data: {
        title: 'AI WARS - Feedback',
        formatDateTime: utils.formatDateTime
    },

    onRender: function () {
        var me = this;
        return Feedback.find()
        .desc('date')
        .limit(100)
        .run().asDeferred()
        .then(function (res) {
            me.data.messages = res;
        });
    }
});
}, // end of ui/about_adm



'ui/challenge': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils');

module.exports = View.subclass({
  onInit: function () {
    var challengeId = this.req.params[0];
    this.data.it = require('../data').get('challenges')[challengeId];
    if (!this.data.it) {
        throw new utils.InternalError('Соревнование не найдено', 404);
    }
    this.data.title = utils.format('AI Challenge: {0}', this.data.it.name);
  }
});
}, // end of ui/challenge



'ui/challenges': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Список соревнований',
        challenges: _.sortBy(require('../data').get('challenges'), function (ch) { return -ch.index; })
    }
});
}, // end of ui/challenges



'ui/challenge_adm': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    Bot = require('../models/bot'),
    _ = require('underscore');

var challengeId;

exports = module.exports = View.subclass({
    onInit: function () {
        this.needAdmin();
        challengeId = this.req.params[0];
        this.data.it = require('../data').get('challenges')[challengeId];
        if (!this.data.it) {
            throw new utils.InternalError('Соревнование не найдено', 404);
        }
        this.data.title = utils.format('AI Challenge: {0} - Admin Tools', this.data.it.name);
    },

    onRender: function () {
        var me = this;
        return Bot.groupMax('author', 'submitDate', {
            query: { challenge: challengeId }
        }).then(function (res) {
            return _.sortBy(res, function (doc) { return doc.submitDate; });
        }).map(function (row) {
            return {
                name: row.name,
                date: utils.formatDateTime(row.submitDate),
                source: utils.format('<a href="/sources/{1}">View source ({0} bytes)</a>', row.src.length, row._id.toString()),
                check: utils.format('<input type="checkbox" id="{0}" />', row._id.toString())
            }
        }).then(function (res) {
            me.data.submits = res;
        });
    },
});

exports.onClient = function() {
  $('#check_all').click(function() {
    $('.col_check input').prop('checked', true);
  });

  $('#check_none').click(function() {
    $('.col_check input').prop('checked', false);
  });

  $('#start_contest').click(function() {
    var botIds = _.map($('.col_check input:checked'), function(it) { return it.id; });
    if (botIds.length >= 2) {
      qpost('startContest', { rated: $('#rated').is(':checked'), bots: botIds, challengeId: challengeIdClient }).then(function(contestId) {
        go('/contests/' + contestId);
      });
    }
  });
}
}, // end of ui/challenge_adm



'ui/contest': function(require, module, exports, __dirname) {
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
}, // end of ui/contest



'ui/contests': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    Contest = require('../models/contest');

var challengeId;

module.exports = View.subclass({
  data: {
    columns: [{ raw: 'date' }, 'rated', { id: 'finished', cssClass: 'col_last'}]
  },

  onInit: function () {
    this.needAdmin();
    challengeId = this.req.params[0];
    this.data.it = require('../data').get('challenges')[challengeId];
    if (!this.data.it) {
      throw new utils.InternalError('Challenge not found', 404);
    }
    this.data.title = utils.format('AI Challenge: {0} - Contests', this.data.it.name);
  },

  onRender: function () {
    return Contest.find({ challenge: challengeId })
    .desc('date')
    .run().asDeferred()
    .map(function (c) {
      return {
        date: utils.format('<a href="/contests/{0}">{1}</a>', c._id.toString(), utils.formatDateTime(c.date)),
        rated: c.rated ? 'Rated' : 'Unrated',
        finished: c.finished ? 'Finished' : 'In progress'
      }
    }).then(this.setter('rows'));
  }
});
}, // end of ui/contests



'ui/index': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Главная страница'
    },

    onInit: function () {
        this.data.currentChallenge = _.max(require('../data').get('challenges'), function (ch) { return ch.index });
    }
});

module.exports.onClient = function () {
    /*$(function () {
        var logo = createWidget('logo');
        logo.renderTo($('#logo2'));
    });*/
}

}, // end of ui/index



'ui/login': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Вход в систему'
    }
});
}, // end of ui/login



'ui/news': function(require, module, exports, __dirname) {
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
}, // end of ui/news



'ui/practice': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore'),
    Bot = require('../models/bot');

var challengeId;

exports = module.exports = View.subclass({
    onInit: function () {
        challengeId = this.req.params[0];
        this.data.it = require('../data').get('challenges')[challengeId];
        if (!this.data.it) {
            throw new utils.InternalError('Соревнование не найдено', 404);
        }
        this.data.title = utils.format('AI Challenge: {0} - Тренировка', this.data.it.name);
        this.data.code = this.data.it.code;
        this.data.selId = this.data.it.sampleCodeId;
    },

    onRender: function () {
        if (!this.req.user) return false;
        var me = this;
        return Bot.find({ author: this.req.user, challenge: challengeId }, ['name', 'src'])
        .desc('submitDate')
        .limit(1)
        .run().asDeferred()
        .match(function (bot) {
            if (bot) {
                me.data.code = me.data.code.concat([[bot.name, bot.src]]);
                me.data.selId = me.data.code.length - 1;
            }
        });
    }
});

exports.onClient = function () {
    $('#start_practice').click(function () {
        var botSrc = _.map($('.code_editor'), function (el) {
            return $(el).data('editor').getValue();
        });
        showModal('arena', { it: require('challenges/' + challengeIdClient), id: challengeIdClient, title: 'Тренировочная игра', botSrc: botSrc, mode: 'practice' });
    });
    if (!user) {
        $('#submit_bot').click(function () {
            $('.userinfo #login').click();
        });
    } else {
        $('#submit_bot').click(function () {
            showModal('submit_bot', { it: require('challenges/' + challengeIdClient), id: challengeIdClient, src: $('#code1').data('editor').getValue() });
        });
    }
}
}, // end of ui/practice



'ui/register': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

module.exports = View.subclass({
    data: {
        title: 'AI WARS - Регистрация нового пользователя'
    }
});

module.exports.onClient = function () {
    $('form input:first').focus();
    $('form').submit(function (ev) {
        ev.preventDefault();
        if ($('.register_form #pass').val() != $('.register_form #pass2').val()) {
            showMessage('Пароли не совпадают', 'Ошибка');
        } else {
            qpost('register', { login: $('.register_form #login').val(), pass: $('.register_form #pass').val() }).then(function (res) {
                var dest = window.referer || '/';
                go(dest);
            });
        }
    });
}
}, // end of ui/register



'ui/replay': function(require, module, exports, __dirname) {
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
}, // end of ui/replay



'ui/replays': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

exports = module.exports = View.subclass({
    data: {
        title: 'AI WARS - Реплеи',
    }
});

exports.onClient = function () {
    $('.challenges_menu').change(function (ev, hash) {
        var afterRender = $.noop;
        $('#col_right').empty();
        if (hash) {
            qget('replaysList', { challenge: hash }).map(function (match) {
                match.id = match._id;
                var link = createWidget('replay_link', { match: match, challenge: hash });
                afterRender = _.bind(link.afterRender, link);
                return {
                    link: link.render(),
                    views: utils.format('Просмотров: {0}', match.replayViews)
                };
            }).then(function (rows) {
                var table = createWidget('table', { columns: [{ raw: 'link' }, { id: 'views', cssClass: 'col_last' }], data: rows, title: 'Реплеи', subtitle: $('#' + hash).data('name') });
                table.renderTo($('#col_right')).then(afterRender);
            }).end();
        }
    });
}
}, // end of ui/replays



'ui/scores': function(require, module, exports, __dirname) {
/// <reference path="view.js" />
var View = require('./view'),
    utils = require('../utils'),
    _ = require('underscore');

exports = module.exports = View.subclass({
    data: {
        title: 'AI WARS - Лучшие результаты',
    }
});

exports.onClient = function () {
    $('.challenges_menu').change(function (ev, hash) {
        $('#col_right').empty();
        if (hash) {
            createWidget('challenge_scores', { title: 'Результаты соревнования', subtitle: $('#' + hash).data('name'), id: hash })
            .renderTo($('#col_right'));
        }
    });
}
}, // end of ui/scores



'ui/source': function(require, module, exports, __dirname) {
/// <reference path="./view.js" />
var Bot = require('../models/bot'),
    utils = require('../utils'),
    InternalError = utils.InternalError;

exports = module.exports = require('./view').subclass({
    onInit: function() {
        this.needAdmin();
    },

    onRender: function () {
        var me = this;
        return Bot.p_findById(this.req.params[0]).then(function (bot) {
            if (!bot) throw new InternalError("Bot not found", 404);
            me.data.bot = bot;
            me.data.title = utils.format("Source code: {0}", bot.fullName());
        });
    }
});
}, // end of ui/source



'ui/view': function(require, module, exports, __dirname) {
/// <reference path="../vs_intel.js" />
/// <reference path="../utils.js" />
/// <reference path="../template.js" />
if (this.vs_intel) vs_intel.view = View;

var _ = require('underscore'),
    utils = require('../utils'),
    template = require('../template'),
    path = require('path'),
    deferred = require('deferred'),
    InternalError = utils.InternalError;

var View = module.exports = utils.Class({
    data: {
        isModal: false
    },

    init: function (moduleName, name, req, res, parent, options) {
        this.moduleName = moduleName;
        this.name = name;
        this.req = req;
        this.res = res;
        this.parent = parent;
        this.data = _.clone(this.constructor.prototype.data);
        this.data.me = this;
        this.data.parent = this.parent;
        this.data.ui = _.bind(this.renderWidget, this);
        this.data.uis = _.bind(this.renderWidgetShared, this);
        _.extend(this.data, options);
        this.onInit(options);
    },

    onInit: function () { },

    renderPage: function (next) {
        var me = this;
        me.data.startGen = utils.now();
        me.data.now = utils.now;
        this.render().then(function (res) {
            me.data.body = res;
            return template.render(template.layoutFile, me.data);
        }).then(function (res) {
            me.res.send(res);
        }).end(null, function(err) {
            next(err);
        });
    },

    render: function () {
        var me = this;
        return deferred(me.onRender() || true).then(function () {
            return template.render(path.resolve(__dirname, me.moduleName + '.html'), me.data);
        });
    },

    getChildrenNames: function() {
        return this.data.children ? _.keys(this.data.children) : [];
    },

    afterRender: function() {
        utils.require(require, './' + this.moduleName).initOnClient(this.getChildrenNames());
    },
    
    renderTo: function (el, isReplace) {
        var me = this;
        return me.render().then(function (res) {
            el[isReplace ? 'html' : 'append'](res);
            me.afterRender();
        });
    },

    onRender: function () { return true; },

    getAncestor: function () {
        var res = this;
        while (res.parent) { res = res.parent; }
        return res;
    },

    renderWidgetBase: function (widgetModule, widgetName, options) {
        var Widget = utils.require(require, './' + widgetModule);
        var widget = new Widget(widgetModule, widgetName, this.req, this.res, this, options);
        var top = this.getAncestor();
        top.data.children || (top.data.children = {});
        top.data.children[widgetModule] = true;
        return widget.render();
    },

    renderWidget: function (name, options) {
        return this.renderWidgetBase('server/' + name, name, options);
    },

    renderWidgetShared: function (name, options) {
        return this.renderWidgetBase('shared/' + name, name, options);
    },

    getModalOptions: function () { return this.modal || {}; },

    addHead: function (key, line) {
        this.headKeys || (this.headKeys = {});
        if (!(key in this.headKeys)) {
            this.headKeys[key] = true;
            this.data.head || (this.data.head = '');
            this.data.head += line + '\n';
        }
    },

    needAdmin: function() {
      if (!this.req.user || !this.req.user.admin) {
        throw new InternalError("Access denied", 403);
      }
    },

    setter: function(field) {
      var me = this;
      return function(data) {
        me.data[field] = data;
      }
    }

});

_.extend(View, {
    initOnClient: function (children) {
        _.each(children, function (name) {
            require('./' + name).onClient();
        });
        this.onClient();
    },

    onClient: function () { },

    subclass: function (proto) {
        var res = utils.Class(this, proto || {});
        res.initOnClient = this.initOnClient;
        res.onClient = this.onClient;
        return res;
    },
});
}, // end of ui/view



'ui/server/challenges_menu': function(require, module, exports, __dirname) {
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
}, // end of ui/server/challenges_menu



'ui/server/challenge_body': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view');
}, // end of ui/server/challenge_body



'ui/server/challenge_brief': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

exports = module.exports = require('../view').subclass();
}, // end of ui/server/challenge_brief



'ui/server/challenge_head': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view');
}, // end of ui/server/challenge_head



'ui/server/challenge_teaser': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view');
}, // end of ui/server/challenge_teaser



'ui/server/code_editor': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view').subclass({
    onInit: function () {
        this.getAncestor().addHead('codemirror', '<link rel="stylesheet" href="/css/codemirror.css" />');
    }
});

module.exports.onClient = function() {
    $('.code_editor select').change(function() {
        var $this = $(this);
        var editor = $this.parents('.code_editor').data('editor');
        if (editor.isNew) {
            editor.isNew = false;
            $this.find('option[value="new"]').data('code', editor.getValue());
        }
        editor.updating = true;
        editor.setValue($this.find('option[value="' + $this.val() + '"]').data('code'));
    });
    $('.code_editor').each(function() {
        var $this = $(this);
        var ta = $this.find('textarea').get(0);
        var select = $this.find('select');
        $this.data('editor', CodeMirror.fromTextArea(ta, {
            theme: 'lesser-dark',
            lineWrapping: true,
            indentUnit: 4,
            onChange: function (me) {
                if (me.updating) {
                    me.updating = false;
                    return;
                }
                if (select.val() != "new") {
                    if (!select.find('option[value="new"]').length) {
                        select.append('<option value="new">Новый Бот</option>');
                    }
                    select.val('new');
                    me.isNew = true;
                }
            }
        }));
        select.val($this.data('selId')).trigger('change');
    });
}
}, // end of ui/server/code_editor



'ui/server/crumbs': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view');
}, // end of ui/server/crumbs



'ui/server/footer': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

module.exports = require('../view');

}, // end of ui/server/footer



'ui/server/header': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view').subclass();
}, // end of ui/server/header



'ui/server/post': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view');
}, // end of ui/server/post



'ui/server/replay_teaser': function(require, module, exports, __dirname) {
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
}, // end of ui/server/replay_teaser



'ui/server/top_posts': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
var _ = require('underscore');

module.exports = require('../view').subclass({
    onInit: function () {
        var news = require('../../data').get('news').slice(0, 2);
        news.reverse();
        this.data.news = news;
    }
});
}, // end of ui/server/top_posts



'ui/server/userinfo': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view').subclass();

module.exports.onClient = function () {
    if (!user) {
        $('.userinfo a#login').click(function (ev) {
            ev.preventDefault();
            showModal('login');
        });
    }
}
}, // end of ui/server/userinfo



'ui/shared/arena.html': "<div class=\"arena\" data-id=\"{{id}}\">\r\n    <div class=\"vis\"></div>\r\n    {{ uis('progressbar', {it: {current: 0, progress: 0, max: it.maxTurns, interval: 50} }) }}\r\n</div>",



'ui/shared/arena': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

var _ = require('underscore'),
    utils = require('../../utils');

exports = module.exports = require('../view').subclass({
    modal: {
        buttons: [
            { text: 'Пауза', click: pause },
            { text: 'Закрыть' }
        ],

        onClose: function () {
            stopWorld();
            progressBar.stop();
            turns = saved = null;
        }
    },

    onInit: function (opt) {
        this.modal.title = opt.title;
        utils.assertClient();
        botSrc = opt.botSrc;
        botNames = opt.botNames;
        replay = opt.replay;
        mode = opt.mode;
        challenge = opt.it;
        turns = [];
        saved = {};
    }
});

var botSrc, botNames;
var bots;
var progressBar;
var world, vis, visState;
var challenge;
var turns;
var worldTimer;
var saved;
var replay;
var mode;

function pause() {
    if (progressBar.paused) {
        startWorld();
        progressBar.start();
        $('.modal').data('modal').buttons[0].html('Пауза');
    } else {
        stopWorld();
        progressBar.stop();
        $('.modal').data('modal').buttons[0].html('Старт');
    }
    return false;
}

function step(num, old) {
    if (num == old + 1) {
        visState.applyStep(turns[num - 1]);
        vis.draw(visState);
    } else {
        num = num - (num % 10);
        if (num in saved) {
            visState = saved[num].clone();
            progressBar.current = num;
            vis.draw(visState);
        } else {
            progressBar.current = old;
        }
    }
}

function startWorld() {
    if (!worldTimer) {
        _.defer(function () {
            worldTimer = utils.setRepeated(function () {
                var curTurn = world.turn;
                if (curTurn >= challenge.maxTurns)
                    return false;
                if (mode == 'practice') {
                    turns[curTurn] = world.getStep(bots);
                } else {
                    turns[curTurn] = replay[curTurn];
                }
                world.applyStep(turns[curTurn]);
                if (world.turn % 10 == 0) {
                    saved[world.turn] = world.clone();
                }
                progressBar.update(world.turn);
            }, 0);
        });
    }
}

function stopWorld() {
    if (worldTimer) {
        worldTimer.stop();
        worldTimer = null;
    }
}

exports.onClient = function () {
    progressBar = $('.arena .progressbar').data('it');
    progressBar.change(step);
    if (mode == 'practice') {
        try {
            bots = _.map(botSrc, challenge.getBot);
        } catch (e) {
            console.log(e.stack || e.toString());
            showMessage('<pre>' + (e.message) + '</pre>', 'Ошибка компиляции', function() {
                $('.modal').data('modal').close();
            });
            return;
        }
    }
    world = new challenge.State();
    saved[0] = world.clone();
    vis = new challenge.Visualiser($('.arena .vis'));
    if (botNames) {
        vis.botNames = botNames;
    }
    vis.ready().then(function () {
        visState = world.clone();
        vis.draw(visState);
        if (mode == 'practice') {
            world.initBots(bots);
        }
        startWorld();
        progressBar.start();
    });
}

}, // end of ui/shared/arena



'ui/shared/challenge_current.html': "{{ uis('table', { title: _c.title, subtitle: _c.subtitle, columns: ['place', 'name', 'submitDate', 'score'], data: scores }) }}",



'ui/shared/challenge_current': function(require, module, exports, __dirname) {
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
}, // end of ui/shared/challenge_current



'ui/shared/challenge_scores.html': "{{ uis('table', { title: _c.title, subtitle: _c.subtitle, columns: ['place', 'name', 'submitDate', 'score'], data: scores }) }}",



'ui/shared/challenge_scores': function(require, module, exports, __dirname) {
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
}, // end of ui/shared/challenge_scores



'ui/shared/login.html': "<div class=\"login_form form\">\r\n    <label>\r\n        Логин:\r\n        <input type=\"text\" id=\"login\" />\r\n    </label>\r\n    <label>\r\n        Пароль:\r\n        <input type=\"password\" id=\"pass\" />\r\n    </label>\r\n    <div><a href=\"/register\">$регистрация</a></div>\r\n    {{ if (!isModal) }}\r\n    <div class=\"buttons\">\r\n        <button class=\"submit\" onclick=\"require('ui/shared/login').login();\">Вход</button>\r\n    </div>\r\n    {{ end }}\r\n</div>\r\n<script>\r\n    var referer = '{{ me.req && me.req.headers.referer }}';\r\n</script>\r\n",



'ui/shared/login': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

var login = exports.login = function () {
    qpost('login', { login: $('.login_form #login').val(), pass: $('.login_form #pass').val() }).then(function () {
        if (window.referer) {
            go(referer);
        } else {
            location.reload();
        }
    });
    return false;
}

exports = module.exports = require('../view').subclass({
    modal: {
        buttons: [
            { text: 'Вход', click: login }
        ]
    }
});
}, // end of ui/shared/login



'ui/shared/match_row.html': "<td style=\"width: 300px\">\r\n  {{ html(match.name) }}\r\n</td>\r\n\r\n<td>\r\n  <div class=\"progressbar_container\" style=\"display:inline-block; width: 200px{{ match.result == -1 ? '' : '; display:none' }}\">\r\n  {{ uis('progressbar', {it: {current: 0, progress: 0, max: maxTurns, interval: 50} }) }}\r\n  </div>\r\n{{ if (match.result == 0) }}\r\n  <div class=\"match_result\" style=\"display:inline-block\">\r\n    Draw<br />\r\n    {{ uis('replay_link', { match: match, title: 'View Replay', challenge: challenge }) }}\r\n  </div>\r\n{{ else if (match.result > 0) }}\r\n  <div class=\"match_result\" style=\"display:inline-block\">\r\n    Winner: {{ match.botNames[match.result - 1] }}<br />\r\n    {{ uis('replay_link', { match: match, title: 'View Replay', challenge: challenge }) }}\r\n  </div>\r\n{{ end }}\r\n</td>\r\n\r\n<td class=\"col_source\">\r\n  <button class=\"start_match\" data-match=\"{{ match.id }}\">Start</button>\r\n  <button style=\"display:none\" class=\"stop_match\">Stop</button>\r\n  <button style=\"display:none\" class=\"continue_match\">Continue</button>\r\n</td>\r\n",



'ui/shared/match_row': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

exports = module.exports = require('../view').subclass();
}, // end of ui/shared/match_row



'ui/shared/modal.html': "<table class=\"modal_frame\">\r\n    <tr>\r\n        <td>\r\n            <div class=\"modal\">\r\n                {{ if (_c.title) }}\r\n                <h1>{{title}}</h1>\r\n                {{ end }}\r\n                <div class=\"text\">{{html}}</div>\r\n                <div class=\"buttons\">\r\n                    {{ each (b, i in buttons) }}\r\n                    <button id=\"button{{i}}\" data-num=\"{{i}}\">{{b.text}}</button>\r\n                    {{/each}}\r\n                </div>\r\n            </div>\r\n        </td>\r\n    </tr>\r\n</table>\r\n",



'ui/shared/progressbar.html': "<div class=\"progressbar\" data-it='{{@ json(it)}}'>\r\n    <div id=\"hint\" class=\"hint\"></div>\r\n    <div class=\"progress_frame\">\r\n        <div id=\"progress\" class=\"progress\"></div>\r\n        <div id=\"current\" class=\"current\"></div>\r\n    </div>\r\n    <div id=\"meter\" class=\"meter\"></div>\r\n</div>\r\n",



'ui/shared/progressbar': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

var utils = require('../../utils'),
    _ = require('underscore');

exports = module.exports = require('../view').subclass({
});

var elHint;

function hint() {
    if (!elHint) {
        elHint = $('<div class="progressbar_hint"></div>').appendTo($('body'));
    }
    return elHint;
}

var ProgressBar = utils.Class({
    current: 0,
    progress: 100,
    max: 100,
    interval: 100,

    init: function (el) {
        var me = this;
        this.el = el;
        this.elFrame = el.find('.progress_frame');
        this.elCur = el.find('#current');
        this.elPro = el.find('#progress');
        this.elMeter = el.find('#meter');
        this.elHint = hint();
        _.extend(this, el.data('it'));
        el.data('it', this);
        this._change = $.Callbacks();
        this.paused = true;
        this.update();
        this.elPro.add(this.elCur).mousedown(function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            me.set(me.calcValue(ev.pageX));
        });
        this.elFrame.hover(function() {
            me.elHint.addClass('visible');
        }, function() {
            me.elHint.removeClass('visible');
        });
        this.elFrame.mousemove(function (ev) {
            me.elHint.css({ left: ev.pageX, top: me.elFrame.offset().top - 20 });
            me.elHint.html(me.calcValue(ev.pageX));
        });
    },

    calcValue: function (x) {
        x = x - this.elFrame.offset().left;
        return Math.round(x / (this.elFrame.width() + 1) * this.max);
    },

    update: function (progress) {
        if (typeof progress !== "undefined")
            this.progress = progress;
        this.current = utils.clamp(this.current, 0, this.max);
        this.progress = utils.clamp(this.progress, 0, this.max);
        var w = this.elFrame.width();
        var wCur = Math.round(this.current / this.max * w);
        var wPro = Math.round(this.progress / this.max * w);
        this.elCur.width(wCur);
        this.elPro.width(wPro);
        this.elMeter.html(utils.format('{0}/{1}', this.current, this.max));
    },

    change: function (fn) {
        if (fn) {
            this._change.add(fn);
        } else {
            this._change.fire(this.current, this.current);
        }
    },

    set: function (newCurrent) {
        var oldCurrent = this.current;
        this.current = newCurrent;
        this._change.fire(this.current, oldCurrent);
        this.update();
    },

    start: function () {
        var me = this;
        if (this.paused) {
            this.timer = utils.setInterval(function () {
                if (me.current < me.max) {
                    if (me.current < me.progress) {
                        me.set(me.current + 1);
                    }
                }
                else {
                    return false;
                }
            }, this.interval);
            this.paused = false;
        }
    },

    stop: function () {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.paused = true;
    }
});

exports.onClient = function () {
    $('.progressbar').each(function () {
        new ProgressBar($(this));
    });
}

}, // end of ui/shared/progressbar



'ui/shared/replay_link.html': "<a class=\"view_replay\" data-challenge=\"{{ challenge }}\" data-match=\"{{ match.id }}\" data-name=\"{{@ match.name }}\" data-bot-names=\"{{@ json(match.botNames) }}\" href=\"/replays/{{ match.id }}\">{{@ _c.title || match.name }}</a>\r\n",



'ui/shared/replay_link': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

exports = module.exports = require('../view').subclass();

exports.onClient = function () {
    $('.view_replay').die('click').live('click', function (ev) {
        ev.preventDefault();
        var $this = $(this);
        var chId = $this.data('challenge');
        var challenge = require('challenges/' + chId);
        qget('getReplay', { match: $this.data('match') }).then(function (replayJSON) {
            var replay = JSON.parse(replayJSON);
            return showModal('arena', { it: challenge, id: chId, title: $this.data('name'), replay: replay, botNames: $this.data('botNames'), mode: 'replay' });
        }).end();
    });
}
}, // end of ui/shared/replay_link



'ui/shared/submit_bot.html': "<div class=\"form submit_bot_form\">\r\n    <label><a href=\"#\">Важная информация</a></label>\r\n    <label>\r\n        Название бота:\r\n        <input type=\"text\" id=\"name\" value=\"{{ qget('botName').then(html) }}\" />\r\n    </label>\r\n    <label>\r\n        Код:\r\n        <textarea id=\"code\">{{@ src}}</textarea>\r\n    </label>\r\n</div>",



'ui/shared/submit_bot': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />

var utils = require('../../utils');

var challenge, challengeId;

function submit() {
    var name = $('.submit_bot_form #name').val();
    var src = $('.submit_bot_form #code').val();
    try {
        if ($.trim(src) == '') {
            throw new Error('Заполните поле "Код".');
        }
        var ok = true;
        $('#code1 option').each(function () {
            if ($(this).val() != "new") {
                if ($.trim($(this).data('code')) == $.trim(src)) {
                    return (ok = false);
                }
            }
        });

        if (!ok) {
            throw new Error("Ваш код совпадает с одним из примеров!");
        }
        var bot = challenge.getBot(src);
        var state = new challenge.State();
        state.initBots([bot]);
        state.getStep([bot, bot]);
    } catch (e) {
        showMessage(e.message, 'Ошибка');
        return false;
    }

    qget('botNameCheck', { challengeId: challengeId, name: name }).then(function () {
        qpost('submitBot', { challengeId: challengeId, name: name, src: src }).then(function () {
            go('/challenges/' + challengeId);
        });
    });

    return false;
}

exports = module.exports = require('../view').subclass({
    modal: {
        title: 'Отправить AI на сервер',
        buttons: [
      { text: 'OK', click: submit },
      { text: 'Отмена' }
        ]
    },

    onInit: function (options) {
        utils.assertClient();
        challenge = options.it;
        challengeId = options.id;
    }
});
}, // end of ui/shared/submit_bot



'ui/shared/table.html': "<article class=\"scoreboard\">\r\n    <header>\r\n        {{ if (_c.title) }}<h1>{{title}}</h1>{{ end }}\r\n        <h2>{{_c.subtitle || '&nbsp;'}}</h2>\r\n    </header>\r\n    <table>\r\n    {{ each (row in data) }}\r\n        <tr>\r\n            {{ each (column in columns) }}\r\n                <td class=\"{{ column.cssClass || ('col_' + (column.raw || column.id || column)) }}\">\r\n                  {{ column.raw ? row[column.raw] : html(row[column.id || column]) }}\r\n                </td>\r\n            {{ /each }}\r\n        </tr>\r\n    {{ /each }}\r\n    </table>\r\n</article>",



'ui/shared/table': function(require, module, exports, __dirname) {
/// <reference path="../view.js" />
module.exports = require('../view');
}, // end of ui/shared/table



'ui/shared/user_scores.html': "{{ uis('table', { title: _c.title, subtitle: _c.subtitle, columns: ['place', 'name', 'score'], data: scores }) }}",



'ui/shared/user_scores': function(require, module, exports, __dirname) {
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
}, // end of ui/shared/user_scores



'challenges/mario': function(require, module, exports, __dirname) {
var utils = require('../utils');
var _ = require('underscore');

var mx = 25, my = 25;
var max_turn = exports.maxTurns = 500;

var codes = {
    '.': 0,
    '$': 1,
    '1': 1000000,
    '2': 2000000
};

var MOVE_X = 0, MOVE_Y = 1, MOVE_NX = 2, MOVE_NY = 3;

function initStateData() {
    function inRange(x, l, r) {
        if (l > r) {
            var tmp = l; l = r; r = tmp;
        }
        return (x >= l && x <= r);
    }
    var res = [];
    for (var i = 0; i < mx; ++i)
        for (var j = 0; j < my; ++j)
            if (i % 2 && inRange(j, i, mx - 1 - i) || j % 2 && inRange(i, j, my - 1 - j))
                res[j * mx + i] = codes.$;
    res[0] = codes['1'];
    res[mx * my - 1] = codes['2'];

    /*for (var i = 0; i < mx; ++i)
        for (var j = 0; j < my; ++j) {
            var r = utils.random(3);
            if (r == 1) res[j * mx + i] = ['1', 0];
            else if (r == 2) res[j * mx + i] = ['2', 0];
        }*/
    
    return res;
}

function coords(x, y) { return y * mx + x; }

function getPlayerId(d) {
    return '0123456789'.charAt(Math.floor(d / 1000000));
}

var State = exports.State = utils.Class({
    init: function () {
        this.data = initStateData();
        this.turn = 0;
        this.score = {'1': 0, '2': 0};
	this.boundView = _.bind(this.view, this);
	this.boundView.mx = mx;
	this.boundView.my = my;
	if (Object.freeze) {
	    Object.freeze(this.boundView);
	}
    },

    clone: function() {
        var res = _.clone(this);
        res.data = this.data.slice();
        res.score = _.clone(this.score);
        return res;
    },

      homes: { '1': [0, 0], '2': [mx - 1, my - 1] },

    winner: function() {
      if (this.turn < max_turn)
        return -1;
      return this.score['1'] > this.score['2'] ? 1 : (this.score['1'] < this.score['2'] ? 2 : 0);
    },

    view: function(x, y) {
        if (x < 0 || x >= mx || y < 0 || y >= my)
            return ['X', 0];
        var d = this.data[coords(x, y)];
        if (!d) return ['.', 0];
        if (d == 1) return ['$', 0];
        var id = getPlayerId(d);
        var coins = d % 1000000;
        return [id, coins];
    },

    getLegalMoves: function(moves) {
        var me = this;
        if (!moves.length) {
            return moves;
        }
        var id = getPlayerId(me.data[coords(moves[0][MOVE_X], moves[0][MOVE_Y])]);
        var qq = {};
        var b = {};
        var c0 = {};
        var c1 = {};
        for (var i = 0, l = moves.length; i < l; ++i) {
            var m = moves[i];
            if (m[MOVE_NX] >= 0 && m[MOVE_NX] < mx && m[MOVE_NY] >= 0 && m[MOVE_NY] < my) {
              c0[i] = coords(m[MOVE_X], m[MOVE_Y]);
                c1[i] = coords(m[MOVE_NX], m[MOVE_NY]);
                b[c0[i]] = true;
                qq[c1[i]] = i;
            } else {
                moves[i] = null;
            }
        }
        for (var i = 0, l = mx * my; i < l; ++i) {
            var it = me.data[i];
            if (it && getPlayerId(it) == id && !b[i])
                qq[i] = -1;
        }
        var changed = true;
        while (changed) {
            changed = false;
            for (var i = 0, l = moves.length; i < l; ++i) {
                var m = moves[i];
                if (m && qq[c1[i]] !== i) {
                    qq[c0[i]] = i;
                    moves[i] = null;
                    changed = true;
                }
            }
        }
        return _.compact(moves);
        //console.log('kre: ' + ($.now() - test));
        //return moves;
    },

    applyStep: function(step) {
        var me = this;
        var moves = step.moves;
        var keep = [];
        var l = moves.length;
        for (var i = 0; i < l; ++i) {
            var move = moves[i], c = coords(move[MOVE_X], move[MOVE_Y]);
            keep[i] = this.data[c];
            this.data[c] = null;
        }
        for (var i = 0; i < l; ++i) {
            var move = moves[i];
            var it = keep[i];
            var itId = getPlayerId(it);
            var c = coords(move[MOVE_NX], move[MOVE_NY]);
            var prev = me.data[c] || 0;
            var prevId = getPlayerId(prev);
            if (prev == 1) it += 1;
            else if (prevId != itId && prevId != 0) it = null;
            if (it) {
                var home = me.homes[itId];
                if (home[0] == move[MOVE_NX] && home[1] == move[MOVE_NY]) {
                    me.score[itId] += (it % 1000000);
                    it -= (it % 1000000);
                }
            }
            me.data[c] = it;
        }
        me.turn += 1;
        if (me.turn % 20 == 0) {
            _.each(me.homes, function(home, id) {
                var c = coords(home[0], home[1]);
                if (me.view(home[0], home[1])[0] == id) {
                    l: for (var x = home[0] - 1; x <= home[0] + 1; ++x)
                        for (var y = home[1] - 1; y <= home[1] + 1; ++y) {
                            if (me.view(x, y)[0] == '.') {
                                c = coords(x, y);
                                break l;
                            }
                        }
                }
                me.data[c] = codes[id];
            });
        }
    },

    initBots: function (bots) {
    },

    getStep: function (bots) {
        if (this.turn >= max_turn)
            return false;
        var cur = this.turn % bots.length;
        var id = '123456789'.charAt(cur);
        var moves = [];
        var c = 0;
        for (var j = 0; j < my; ++j)
            for (var i = 0; i < mx; ++i, ++c) {
                if (this.data[c] && getPlayerId(this.data[c]) == id) {
                    var move;
                    try {
                        move = bots[cur].move(i, j, this.boundView, this.turn);
                    } catch (e) { console.log(e); move = null; }
                    if (!move || typeof move[0] != 'number' || typeof move[1] != 'number' || move[0] == 0 && move[1] == 0)
                        continue;
                    var nx = i + sign(move[0]);
                    var ny = j + sign(move[1]);
                    move = [i, j, nx, ny];
                    moves.push(move);
                }
            }
        moves = this.getLegalMoves(moves);
        return { cur: cur, moves: moves };
    }

});

function sign(x) {
    return x > 0 ? 1 : (x < 0 ? -1 : 0);
}

exports.Visualiser = utils.Class({
    init: function(target) {
        this.target = target;
    },

    botNames: ['RED', 'GREEN'],

    ready: function () {
        var d = $.Deferred();
        var w = this.w = 16 * (mx + 2);
        var h = this.h = 16 * (my + 2);
        this.canvas = $(utils.format('<canvas width="{w}" height="{h}"></canvas>', { w: w, h: h }));
        this.target.html(this.canvas);
        this.ctx = this.canvas[0].getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.target.prepend(utils.format('<div class="scores">' +
            '<div class="p1frame p1color">{0} <div class="coin"></div><span class="x">x</span> <span id="p1" class="score"></span></div>' +
            '<div class="p2frame p2color">{1} <div class="coin"></div><span class="x">x</span> <span id="p2" class="score"></span></div>' +
            '<div id="winner" class="winner"></div>' +
            '</div><div style="clear:both"></div>', this.botNames[0], this.botNames[1]));
        this.scores = { '1': $('#p1', this.target), '2': $('#p2', this.target) };
        this.winner = $('#winner', this.target);
        this.img = new Image();
        this.img.src = '/images/mario.png';
        this.img.onload = function () {
            d.resolve();
        }
        return d;
    },

    draw: function(state) {
        var me = this;
        me.frame = Math.floor($.now() / 250);
        me.ctx.fillStyle = '#222';
        me.ctx.fillRect(0, 0, me.w, me.h);
        for (var i in state.homes) {
            me.drawTile(state.homes[i][0], state.homes[i][1], 1, 2);
        }
        for (var x = -1; x <= mx; ++x) {
            for (var y = -1; y <= my; ++y) {
                if (x < 0 || y < 0 || x >= mx || y >= my)
                    me.drawTile(x, y, 0, 2);
                else {
                    var d = state.data[coords(x, y)];
                    if (!d) continue;
                    switch (d) {
                        case 1:
                            me.drawCoin(x, y);
                            break;
                        default:
                            me.drawMario(x, y, getPlayerId(d));
                    }
                }
            }
        }
        for (var i in state.score) {
            me.scores[i].html(state.score[i]);
        }
        if (state.turn >= max_turn) {
            var winner;
            if (state.score['1'] > state.score['2']) winner = $(utils.format('<span class="p1color">Winner: {0}!</span>', me.botNames[0]));
            else if (state.score['1'] < state.score['2']) winner = $(utils.format('<span class="p2color">Winner: {0}!</span>', me.botNames[1]));
            else winner = $('<span>Draw!</span>');
            me.winner.html(winner);
        }
        /*var u1 = _.reduce(state.data, function(res, it) { return it && it[0] == '1' ? res + 1 : res }, 0);
        var u2 = _.reduce(state.data, function(res, it) { return it && it[0] == '2' ? res + 1 : res }, 0);
        this.target.append(utils.format('<div>Turn: {0} P1: {1} P2: {2} U1: {3} U2: {4}</div>', state.turn, state.score['1'], state.score['2'], u1, u2));*/
    },

    drawTile: function (x, y, tileX, tileY) {
        var destX = (x + 1) * 16;
        var destY = (y + 1) * 16;
        var srcX = tileX * 16;
        var srcY = tileY * 16;
        this.ctx.drawImage(this.img, srcX, srcY, 16, 16, destX, destY, 16, 16);
    },

    drawCoin: function (x, y) {
        var animFrame = this.frame % 8;
        var tileX = animFrame <= 4 ? animFrame : 8 - animFrame;
        this.drawTile(x, y, tileX, 3);
    },

    drawMario: function (x, y, id) {
        var tileY = '123456789'.indexOf(id);
        var tileX = (this.frame + tileY) % 2;
        this.drawTile(x, y, tileX, tileY);
    }
    });

    var getBot = exports.getBot = function (src) {
        var move = (new Function('utils', src + ';return move;'))({ random: utils.random });
        return { move: move };
    }
}, // end of challenges/mario



'utils': function(require, module, exports, __dirname) {
if (this.vs_intel) exports = vs_intel.utils = {};

var _ = require('underscore'),
  crypto = require('crypto'),
  deferred = require('deferred');

exports.debug = false;

var Class = exports.Class = function (Ancestor, proto) {
    /// <signature>
    /// <summary>Объявление класса. Метод init будет вызван в конструкторе.</summary>
    /// <param name="proto" type="Object">Прототип.</param>
    /// </signature>
    /// <signature>
    /// <summary>Объявление класса. Метод init будет вызван в конструкторе.</summary>
    /// <param name="Ancestor" type="Object">Класс для наследования.</param>
    /// <param name="proto" type="Object">Прототип.</param>
    /// </signature>
    if (typeof proto == "undefined") {
        proto = Ancestor;
        Ancestor = null;
    }
    var res = function () {
        this.constructor = res;
        if (this.init) {
            this.init.apply(this, arguments);
        } else if (this.super) {
            this.super.apply(this, arguments);
        }
    }
    res.prototype = proto;
    if (Ancestor !== null) {
        res.prototype.super = Ancestor;
        res.prototype.callSuper = function (method, args) {
            args = Array.prototype.slice.call(arguments, 1);
            return this.super.prototype[method].apply(this, args);
        }
        res.prototype.__proto__ = Ancestor.prototype;
    }
    return res;
}

// Форматирует строку.
// msg - строка для форматирования с плейсхолдерами {0}, {1}, итд
// ... - параметры.
var format = exports.format = function (msg, args) {
    if (typeof args != "object")
        args = _.rest(arguments);
    return msg.replace(/\{(.+?)\}/g, function (_, id) {
        if (id && id.charAt(0) == '{') {
            // например, строка {{nya}}
            // в id - {nya
            // заменяем {{nya}
            // результат - {nya}
            return id;
        }
        else {
            return args[id] === null ? '' : args[id];
        }
    });
}

var Library = exports.Library = Class({
    init: function () {
        this.items = {};
    },
    extend: function (items) {
        var me = this;
        _.each(items, function (it, id) {
            it.prototype.id = id;
            if (it.prototype.initLibrary) it.prototype.initLibrary(this);
            me.items[id] = it.prototype;
        });
        _.extend(this, items);
    },
    get: function (id) {
        return this[id].prototype;
    }
});

var random = exports.random = function (x) {
    return _.isArray(x) ?
        x[random(x.length)] :
        Math.floor(Math.random() * x);
}

var deepcopy = exports.deepcopy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
}

var match = exports.match = function (func) {
    /// <summary>Декоратор для функции. Матчит массив, переданный на вход, в аргументы функции.</summary>
    /// <param name="func" type="Function">Функция</param>
    /// <returns type="Function" />
    return function (arr) {
        return func.apply(this, arr);
    }
}

var startswith = exports.startswith = function (s, key) {
    return s.slice(0, key.length) === key;
}

var now = exports.now = function () {
    return (new Date()).getTime();
}

exports.require = function (req, mod) {
    if (exports.debug && req.cache) {
        var mod_file = req.resolve(mod);
        if (mod_file in req.cache) {
            delete req.cache[mod_file];
        }
    }
    return req(mod);
}

var InternalError = exports.InternalError = Class(Error, {
    init: function (msg, code) {
        this.message = msg;
        if (code) this.code = code;
    },

    toString: function () {
        return this.message;
    }
});

var md5 = exports.md5 = function (s) {
    var hash = crypto.createHash('md5');
    var secret = require('./server').md5Secret;
    hash.update(s + secret);
    return hash.digest('hex');
}

var Any = exports.Any = {};

var assertType = exports.assertType = function (obj, schema) {
    var param = '(data)';
    function check(obj, schema) {
        if (typeof schema == "string") {
            return typeof obj === "string" && obj.length <= Number(schema);
        }
        else if (schema === String) return typeof obj === "string";
        else if (schema === Number) return typeof obj === "number";
        else if (schema === Boolean) return typeof obj === "boolean";
        else if (schema === Any) return (typeof obj !== "undefined");
        else if (_.isArray(schema)) {
            return _.isArray(obj) && _.all(obj, function (it) { return check(it, schema[0]); });
        }
        else {
            return _.isObject(obj) && _.all(schema, function (it, key) { param = key; return check(obj[key], it); });
        }
    }
    if (!check(obj, schema)) {
        throw new InternalError('Invalid parameter type for: ' + param);
    };
}

var clamp = exports.clamp = function (num, min, max) {
    if (num < min) return min;
    else if (num > max) return max;
    else return num;
}

var mySetInterval = exports.setInterval = function (fn, interval) {
    var timer = setInterval(function () {
        try {
            if (fn() === false) {
                clearInterval(timer);
            }
        } catch (e) {
            clearInterval(timer);
            throw e;
        }
    }, interval);
    return timer;
}

exports.setRepeated = function (fn, interval) {
    var timer;
    function setTimer() {
        timer = setTimeout(repeatFunc, interval);
    }
    function repeatFunc() {
        if (fn() !== false)
            setTimer();
    }
    setTimer();
    return {
        stopped: false,
        stop: function () {
            if (!this.stopped) {
                clearTimeout(timer);
                this.stopped = true;
            }
        },
        resume: function () {
            if (this.stopped) {
                setTimer();
                this.stopped = false;
            }
        }
    };
}

var isClient = exports.isClient = function () {
    return typeof window !== "undefined";
}

var assertClient = exports.assertClient = function () {
    if (!isClient())
        throw new Error("This code should be run on client only.");
}

var month_names = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
var formatDate = exports.formatDate = function (date) {
    return format('{day} {month} {year} г.', { day: date.getDate(), month: month_names[date.getMonth()], year: date.getFullYear() });
}

var padZero = exports.padZero = function (x) {
    return x < 10 ? '0' + x : '' + x;
}

exports.formatDateTime = function (date) {
    var now = new Date();
    var dateStr;
    if (now.toDateString() == date.toDateString())
        dateStr = "Сегодня";
    else if (now.getFullYear() == date.getFullYear())
        dateStr = format('{day} {month}', { day: date.getDate(), month: month_names[date.getMonth()] });
    else
        dateStr = formatDate(date);
    return format('{date}, {h}:{m}', { date: dateStr, h: date.getHours(), m: padZero(date.getMinutes()) });
}

exports.deferredHelper = function (d) {
    return function (err, args) {
        if (err) {
            d.resolve(err);
        } else {
            args = _.rest(arguments);
            d.resolve.apply(d, args);
        }
    }
}

var getter = exports.getter = function (fieldName) {
    return function (obj) {
        return obj[fieldName];
    }
}

exports.dict = function (arr, keySelector) {
    if (typeof keySelector !== "function")
        keySelector = getter(keySelector);
    return _.reduce(arr, function (res, it) { res[keySelector(it)] = it; return res; }, {});
}

exports.select = function (obj, fields) {
    var res = {};
    _.each(fields, function (field) {
        res[field] = obj[field];
    });
    return res;
}

var cacheStore = {};
var cacheStoreTime = 300000;

exports.cache = function (key, func) {
    key = JSON.stringify(key);
    var data = cacheStore[key];
    var cur = now();
    if (data && data.time >= cur) {
        return data.value;
    } else {
        cacheStore[key] = { time: cur + cacheStoreTime, value: deferred(func()) };
        return cacheStore[key].value;
    }
}

exports.clearCache = function (key) {
    key = JSON.stringify(key);
    if (key in cacheStore) {
        delete cacheStore[key];
    }
}
}, // end of utils



'template': function(require, module, exports, __dirname) {
/// <reference path="vs_intel.js" />
/// <reference path="utils.js" />
if (this.vs_intel) vs_intel.template = exports = {};

var deferred = require('deferred');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var utils = require('./utils');

var cache = {};

exports.layoutFile = path.resolve(__dirname, 'ui/layout.html');

exports.render = function (fn, data) {
    if (utils.debug || !(fn in cache)) {
        var templ = fs.readFileSync(fn).toString();
        if (templ.charCodeAt(0) == 65279) {
            templ = templ.substr(1);
        }
        cache[fn] = compile(templ, fn);
    }
    return cache[fn](data);
}

var special = {
    'var': '%s',
    'if': '%s{',
    'for ': '%s{',
    'for(': '%s{',
    'while': '%s{',
    'else': '}%s{',
    'end': '}',
    'each': '',
    '/each': '});',
    'once': 'if (_once(_c)) {'
};

var g_once_id = 0;

function make_once(once_id) {
    once_id = once_id || g_once_id++;
    return function (context) {
        var anc = context.me.getAncestor();
        anc.once || (anc.once = {});
        if (!anc.once[once_id]) {
            anc.once[once_id] = true;
            return true;
        } else {
            return false;
        }
    }
}

var compile = exports.compile = function (text, once_id) {
    /// <param name="text" type="String" />

    function addtext(txt) {
        return "_b.push('" + txt.replace(/\\/g, '\\\\').replace(/\'/g, '\\\'').replace(/\n/g, '\\n').replace(/\r/g, '') + "');";
    }

    var re = new RegExp('(\{\{@?)([^]+?)\}\}', 'gm');
    var res;
    var parts = [];
    var i = 0;
    while ((res = re.exec(text)) !== null) {
        if (i < res.index) {
            parts.push(addtext(text.substring(i, res.index)));
        }
        var cmd = res[2].trim();
        if (res[1] === '{{@') {
            cmd = 'html(' + cmd + ')';
        }
        var spec = _.find(_.keys(special), function (spec) { return utils.startswith(cmd, spec); });
        if (spec) {
            if (spec === 'each') {
                var g = /^\s*each\s*\(\s*(.*?)\s+in\s+(.*?)\s*\)\s*$/.exec(cmd);
                parts.push(utils.format('_.each({1}, function({0}) {', g[1], g[2]));
            } else {
                parts.push(special[spec].replace('%s', cmd));
            }
        } else {
            parts.push("_b.push(" + cmd + ");");
        }
        i = re.lastIndex;
    }
    if (i < text.length) {
        parts.push(addtext(text.substr(i)));
    }

    var compiled = new Function('_d', '_', 'html', 'json', '_once', 'return function(_c) { function print(s) { _b.push(s); }; var _b = []; with (_c) {' + parts.join('') + '}; return _d(_b); }');
    parts = null;
    re = null;

    return compiled(function (buffer) {
        if (buffer.length) {
            return deferred.apply(undefined, buffer).then(function (buf) {
                return _.isArray(buf) ? buf.join('') : buf;
            });
        } else {
            return deferred('');
        }
    }, _, _.escape, JSON.stringify, make_once(once_id));
}
}, // end of template



'client': function(require, module, exports, __dirname) {
/// <reference path="vs_intel.js" />
var _ = require('underscore'),
    template = require('./template'),
    deferred = require('deferred');

var createWidget = exports.createWidget = function (name, options) {
    var Widget = require('ui/shared/' + name);
    return new Widget('shared/' + name, name, null, null, null, options);
}

var modalOptionsDefault = {
    buttons: [
        { text: 'OK' }
    ],
    html: ''
};

var back = null;

var showModal = exports.showModal = function (options) {
    if (typeof options == "string") {
        var widgetName = options;
        var widgetOptions = arguments[1] || {};
        widgetOptions.isModal = true;
        var widget = createWidget(widgetName, widgetOptions);
        options = _.extend({}, modalOptionsDefault, widget.getModalOptions());
        return showModal(options).then(function (wnd) {
            return widget.renderTo(wnd.find('.text:first')).then(function () {
                if (!options.nofocus) {
                    wnd.find('.text input:first').focus();
                }
                return wnd;
            });
        }).end();
    }
    options = _.extend({}, modalOptionsDefault, options);
    return template.render('ui/shared/modal.html', options).then(function (res) {
        var frame = $(res);
        var wnd = frame.find('.modal:first');
        var thisBack;
        var clicker = function (num) {
            return function () {
                if (options.buttons[num].click) {
                    var res = options.buttons[num].click.apply(wnd, arguments);
                }
                if (res !== false) {
                    wnd.data('modal').close();
                }
            }
        }
        wnd.data('modal', {
            options: options,
            buttons: [],
            close: function () {
                thisBack.remove();
                frame.remove();
                $(window).unbind('keyup.modal');
                if (options.onClose) {
                    options.onClose.call(wnd);
                }
            },
            click: function (num) {
                return clicker(num)();
            }
        });
        $(window).bind('keyup.modal', function (ev) {
            if (ev.keyCode == 27) {
                wnd.data('modal').close();
            } else if (ev.keyCode == 13) {
                ev.preventDefault();
                clicker(0)();
            }
        });
        if (!back) {
            back = $('<div class="modal_back"></div>');
            back.css('opacity', 0.7);
            back.bind('mousedown mouseup click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
            });
        }
        if (!$('body > .modal_back').length) {
            thisBack = back;
        } else {
            thisBack = $('<div></div>');
        }
        $('body').append(thisBack).append(frame);
        wnd.find('.buttons button').each(function () {
            var num = Number($(this).data('num'));
            var $this = $(this);
            wnd.data('modal').buttons[num] = $this;
            $this.click(clicker(num));
        });
        wnd.draggable({ handle: 'h1' });
        if (!options.nofocus) {
            wnd.find('.text input:first').focus();
        }
        return wnd;
    });
}

var activeLocks = {};

function callLock(lock, func) {
    function dellock() {
        delete activeLocks[lock];
    }
    if (activeLocks[lock]) {
        return deferred(new Error('Call already active'));
    } else {
        activeLocks[lock] = true;
        var res = func();
        res.then(dellock, dellock);
        return res;
    }
}

function wrapAjax(func) {
    return function () {
        var res = deferred();
        func().then(function (r) {
            if (r.success) {
                res.resolve(r.result);
            } else {
                res.resolve(new Error(r.error));
            }
        }, function (_, errType, err) {
            res.resolve(new Error(err || errType));
        });
        var pr = res.promise;
        pr.then(null, function (err) {
            showMessage(err.message, 'Ошибка');
            return err;
        });
        return pr;
    }
}

var qpost = exports.qpost = function (service, data) {
    if (typeof data === typeof undefined) data = {};
    return callLock(service, wrapAjax(function () {
        return $.ajax({
            type: 'POST',
            url: '/ajax/' + service,
            data: JSON.stringify(data),
            dataType: 'json',
            contentType: 'application/json'
        });
    }));
}

var qget = exports.qget = function (service, data) {
    return callLock(service, wrapAjax(function () {
        return $.get('/ajax/' + service, data);
    }));
}

exports.logout = function () {
    qpost('logout').then(function () { window.location.reload(); });
}

exports.go = function (where) {
    window.location.href = where;
}

var showMessage = exports.showMessage = function (text, title, ok) {
    return showModal({ html: text, title: title, buttons: [{ text: 'OK', click: ok }] });
}
}, // end of client



'': null
});