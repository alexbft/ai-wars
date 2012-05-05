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
