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