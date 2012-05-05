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