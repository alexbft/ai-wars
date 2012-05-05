var db = require('../db'),
  ObjectId = db.mongoose.Schema.ObjectId;

module.exports = db.model('Contest', {
    challenge: {type: String, index: true},
    date: { type: Date, default: Date.now, index: true },
    scores: {},
    rated: Boolean,
    finished: { type: Boolean, default: false }
});