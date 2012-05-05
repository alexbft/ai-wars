var db = require('../db'),
  ObjectId = db.mongoose.Schema.ObjectId;

module.exports = db.model('Match', {
    name: String,
    bots: [{ type: ObjectId, ref: 'Bot' }],
    botNames: [String],
    result: {type: Number, default: -1},
    contest: { type: ObjectId, ref: 'Contest', index: true },
    replay: { type: Buffer },
    replayViews: { type: Number, default: 0 }
});

module.exports.replayFields = ['name', 'bots', 'botNames', 'result', 'contest'];