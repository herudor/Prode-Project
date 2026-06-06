const mongoose = require('mongoose');

const groupPredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: String, required: true },
  first: { type: String, required: true },
  second: { type: String, required: true },
  points: { type: Number, default: null }
}, { timestamps: true });

groupPredictionSchema.index({ userId: 1, group: 1 }, { unique: true });

module.exports = mongoose.model('GroupPrediction', groupPredictionSchema);
