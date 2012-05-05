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