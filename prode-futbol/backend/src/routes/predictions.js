const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const TournamentPrediction = require('../models/TournamentPrediction');
const auth = require('../middleware/auth');
const { calculateMatchPoints } = require('../utils/scoring');

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
    const { homeScore, awayScore } = req.body;
    const { matchId } = req.params;

    if (homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ message: 'homeScore y awayScore son requeridos' });
    }

    // Verificar que el partido existe
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Partido no encontrado' });

    // Bloquear si el partido ya comenzó
    if (match.date <= new Date() || match.status !== 'upcoming') {
      return res.status(400).json({ message: 'No se puede predecir: el partido ya comenzó o finalizó' });
    }

    // Crear o actualizar predicción
    const prediction = await Prediction.findOneAndUpdate(
      { userId: req.user._id, matchId },
      { homeScore, awayScore, points: null },
      { upsert: true, new: true }
    );

    // Si el partido ya finalizó (admin actualizó manual), calcular puntos
    if (match.status === 'finished' && match.homeScore !== null) {
      prediction.points = calculateMatchPoints(homeScore, awayScore, match.homeScore, match.awayScore);
      await prediction.save();
    }

    res.json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error guardando predicción' });
  }
});

// GET /api/predictions/tournament - predicción del torneo del usuario
router.get('/tournament/me', auth, async (req, res) => {
  try {
    const pred = await TournamentPrediction.findOne({ userId: req.user._id });
    res.json(pred || {});
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo predicción del torneo' });
  }
});

// POST /api/predictions/tournament - crear o actualizar predicción del torneo
router.post('/tournament/save', auth, async (req, res) => {
  try {
    const { champion, topScorer } = req.body;

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
