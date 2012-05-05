var db = require('../db');

module.exports = db.model('User', {
    login: {
        type: String, set: function (v) {
            this.login_lc = v.toLowerCase();
            return v;
        }
    },
    login_lc: { type: String, unique: true },
    pass: String,
    admin: Boolean
});