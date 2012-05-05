var db = require('../db'),
  ObjectId = db.mongoose.Schema.ObjectId;

module.exports = db.model('Bot', {
    name: { type: String, index: true },
    author: { type: ObjectId, ref: 'User', index: true },
    authorName: String,
    src: String,
    challenge: { type: String, index: true },
    score: { type: Number, default: -1, index: true },
    submitDate: { type: Date, default: Date.now, index: true }
}, function (sch) {
    sch.methods.fullName = function () {
        return this.name + ' (' + this.authorName + ')';
    }
});