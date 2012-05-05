var path = require('path'),
    utils = require('../utils'),
    InternalError = utils.InternalError,
    deferred = require('deferred'),
    services = require('../ajax');

module.exports = function (req, res, next) {
    var serviceName = req.params[0];
    if (services[serviceName]) {
        try {
            console.info('Service call: ' + serviceName);
            deferred(services[serviceName](req.method == 'GET' ? req.query : req.body, req, res) || true).then(function (r) {
                res.send({ success: true, result: r });
            }, function (err) {
                if (!(err instanceof InternalError)) {
                    console.log('Error in ' + serviceName + ': ' + err);
                }
                res.send({ success: false, error: err.toString() });
            });
        } catch (e) {
            if (e instanceof InternalError) {
                res.send({ success: false, error: e.message });
            } else {
                next(e);
            }
        }
    } else {
        next();
    }
}