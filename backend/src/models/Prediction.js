const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  homeScore: {
    type: Number,
    required: true,
    min: 0
  },
  awayScore: {
    type: Number,
    required: true,
    min: 0
  },
  points: {
    type: Number,
    default: null
  }
}, { timestamps: true });

predictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.model('Prediction', predictionSchema);
