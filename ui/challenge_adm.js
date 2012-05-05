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