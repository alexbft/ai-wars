var path = require('path'),
    utils = require('../utils');

module.exports = function (_pageName) {
  return function (req, res, next) {
    var pageName = _pageName || req.params[0];
    if (path.existsSync(path.resolve(__dirname, '../ui/' + pageName + '.js'))) {
      var Page = utils.require(require, '../ui/' + pageName);
      try {
        var page = new Page(pageName, pageName, req, res);
        page.renderPage(next);
      } catch (err) {
        if (err.code) {
          res.send(err.message, err.code);
        } else {
          next(err);
        }
      }
    } else {
      next();
    }
  }
}