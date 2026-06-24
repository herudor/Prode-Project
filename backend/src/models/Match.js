const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  externalId: {
    type: String,
    unique: true,
    sparse: true
  },
  phase: {
    type: String,
    enum: ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third', 'final'],
    required: true
  },
  homeTeamLabel: { type: String, default: null },
  awayTeamLabel: { type: String, default: null },
  group: {
    type: String
  },
  homeTeam: {
    type: String,
    required: true
  },
  awayTeam: {
    type: String,
    required: true
  },
  homeFlag: String,
  awayFlag: String,
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'finished'],
    default: 'upcoming'
  },
  homeScore: {
    type: Number,
    default: null
  },
  awayScore: {
    type: Number,
    default: null
  },
  penaltyWinner: {
    type: String,
    enum: ['home', 'away', null],
    default: null
  },
  round: String
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
