const mongoose = require('mongoose');

const tournamentPredictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  champion: {
    type: String,
    default: null
  },
  topScorer: {
    type: String,
    default: null
  },
  championPoints: {
    type: Number,
    default: 0
  },
  topScorerPoints: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('TournamentPrediction', tournamentPredictionSchema);
