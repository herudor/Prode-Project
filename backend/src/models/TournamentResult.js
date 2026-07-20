const mongoose = require('mongoose');

/**
 * Resultado oficial del torneo (documento único).
 * Se usa la clave fija 'main' para garantizar que solo exista un registro.
 */
const tournamentResultSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'main',
    unique: true
  },
  champion: {
    type: String,
    default: null
  },
  topScorer: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('TournamentResult', tournamentResultSchema);
