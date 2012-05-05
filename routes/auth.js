var User = require('../models/user'),
    sign = require('connect').utils.sign,
    unsign = require('connect').utils.unsign,
    server = require('../server');

// todo: make different signatures based on user password md5.

module.exports = function (req, res, next) {
    if (!req.session.userId && !req.cookies.userid) {
        req.user = null;
        next();
    } else {
        if (req.session.userId && req.cookies.userid && req.session.clearAuth) {
            //console.log('clearing cookie');
            res.clearCookie('userid');
        }
        if (!req.session.userId) {
            var userId = req.session.clearAuth ? false : unsign(req.cookies.userid, server.cookieKey);
            if (userId) {
                req.session.userId = userId;
            } else {
                req.user = null;
                //console.log('clearing cookie (invalid)');
                res.clearCookie('userid');
                return next();
            }
        }
        if (!req.cookies.userid && !req.session.clearAuth) {
            //console.log('setting cookie');
            res.cookie('userid', sign(req.session.userId, server.cookieKey), { expires: new Date(Date.now() + 604800000), httpOnly: true }); // 7 days
        }
        User.p_findById(req.session.userId).then(function (u) {
            req.user = u;
            next();
        }).end();
    }
}