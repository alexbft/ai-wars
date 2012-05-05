var db = require('../db'),
  ObjectId = db.mongoose.Schema.ObjectId;

module.exports = db.model('Feedback', {
    name: String,
    user: String,
    email: String,
    text: String,
    date: { type: Date, default: Date.now, index: true },
});