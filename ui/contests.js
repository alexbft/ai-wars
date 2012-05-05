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