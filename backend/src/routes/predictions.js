const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const TournamentPrediction = require('../models/TournamentPrediction');
const TournamentResult = require('../models/TournamentResult');
const auth = require('../middleware/auth');
const { calculateMatchPoints, calculateKnockoutPoints, isKnockout } = require('../utils/scoring');

// GET /api/predictions - obtener predicciones del usuario logueado
router.get('/', auth, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.user._id })
      .populate('matchId')
      .sort({ createdAt: -1 });
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo predicciones' });
  }
});

// POST /api/predictions/:matchId - crear o actualizar predicción
router.post('/:matchId', auth, async (req, res) => {
  try {
    const { homeScore, awayScore, penaltyWinner } = req.body;
    const { matchId } = req.params;

    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ message: 'homeScore y awayScore son requeridos' });
    }

    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Partido no encontrado' });

    if (match.date <= new Date() || match.status !== 'upcoming') {
      return res.status(400).json({ message: 'No se puede predecir: el partido ya comenzó o finalizó' });
    }

    // En eliminatorias con empate, penaltyWinner es obligatorio
    const knockout = isKnockout(match.phase);
    if (knockout && homeScore === awayScore && !penaltyWinner) {
      return res.status(400).json({ message: 'En eliminatorias con empate debés indicar quién gana en penales' });
    }
    // En grupos o resultados no empatados, penaltyWinner no aplica
    const finalPenalty = (knockout && homeScore === awayScore) ? penaltyWinner : null;

    const prediction = await Prediction.findOneAndUpdate(
      { userId: req.user._id, matchId },
      { homeScore, awayScore, penaltyWinner: finalPenalty, points: null },
      { upsert: true, new: true }
    );

    if (match.status === 'finished' && match.homeScore !== null) {
      prediction.points = knockout
        ? calculateKnockoutPoints(homeScore, awayScore, finalPenalty, match.homeScore, match.awayScore, match.penaltyWinner)
        : calculateMatchPoints(homeScore, awayScore, match.homeScore, match.awayScore);
      await prediction.save();
    }

    res.json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error guardando predicción' });
  }
});

// GET /api/predictions/tournament/me — predicción del torneo + estado de lock
router.get('/tournament/me', auth, async (req, res) => {
  try {
    const pred = await TournamentPrediction.findOne({ userId: req.user._id });
    const tournamentStarted = await Match.exists({
      $or: [
        { status: { $in: ['live', 'finished'] } },
        { date: { $lte: new Date() } }
      ]
    });
    const result = await TournamentResult.findOne({ key: 'main' }).lean();
    res.json({
      ...(pred ? pred.toObject() : {}),
      locked: !!tournamentStarted,
      result: result ? { champion: result.champion, topScorer: result.topScorer } : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo predicción del torneo' });
  }
});

// POST /api/predictions/tournament/save — guardar predicción (se bloquea al iniciar el torneo)
router.post('/tournament/save', auth, async (req, res) => {
  try {
    const { champion, topScorer } = req.body;

    const tournamentStarted = await Match.exists({
      $or: [
        { status: { $in: ['live', 'finished'] } },
        { date: { $lte: new Date() } }
      ]
    });
    if (tournamentStarted) {
      return res.status(400).json({ message: 'Las predicciones están cerradas: el torneo ya comenzó' });
    }

    const pred = await TournamentPrediction.findOneAndUpdate(
      { userId: req.user._id },
      { champion, topScorer },
      { upsert: true, new: true }
    );

    res.json(pred);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error guardando predicción del torneo' });
  }
});

module.exports = router;
