const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const InvitationCode = require('../models/InvitationCode');
const Match = require('../models/Match');
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const TournamentPrediction = require('../models/TournamentPrediction');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const { syncMatches, calculatePredictionPoints } = require('../jobs/syncResults');
const { calculateChampionPoints, calculateTopScorerPoints } = require('../utils/scoring');

// Todas las rutas admin requieren auth + isAdmin
router.use(auth, isAdmin);

// POST /api/admin/invitation-codes - generar código(s)
router.post('/invitation-codes', async (req, res) => {
  try {
    const { count = 1 } = req.body;
    const codes = [];

    for (let i = 0; i < Math.min(count, 50); i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const invCode = await InvitationCode.create({ code, createdBy: req.user._id });
      codes.push(invCode);
    }

    res.status(201).json(codes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generando códigos' });
  }
});

// GET /api/admin/invitation-codes - listar todos los códigos
router.get('/invitation-codes', async (req, res) => {
  try {
    const codes = await InvitationCode.find()
      .populate('usedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo códigos' });
  }
});

// POST /api/admin/sync - sincronizar partidos con TheSportsDB
router.post('/sync', async (req, res) => {
  try {
    await syncMatches();
    res.json({ message: 'Sincronización completada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en sincronización' });
  }
});

// PUT /api/admin/matches/:id - actualizar resultado de un partido manualmente
router.put('/matches/:id', async (req, res) => {
  try {
    const { homeScore, awayScore, status } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Partido no encontrado' });

    const wasFinished = match.status === 'finished';

    if (homeScore !== undefined) match.homeScore = homeScore;
    if (awayScore !== undefined) match.awayScore = awayScore;
    if (status) match.status = status;

    await match.save();

    // Si se marcó como finished y tiene resultados, calcular puntos
    if (!wasFinished && match.status === 'finished' &&
        match.homeScore !== null && match.awayScore !== null) {
      await calculatePredictionPoints(match._id, match.homeScore, match.awayScore);
    }

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando partido' });
  }
});

// GET /api/admin/matches - listar todos los partidos (admin)
router.get('/matches', async (req, res) => {
  try {
    const matches = await Match.find().sort({ date: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo partidos' });
  }
});

// POST /api/admin/matches - crear partido manualmente
router.post('/matches', async (req, res) => {
  try {
    const match = await Match.create(req.body);
    res.status(201).json(match);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creando partido' });
  }
});

// GET /api/admin/users - listar usuarios
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo usuarios' });
  }
});

// PUT /api/admin/tournament-result - definir campeón y goleador del torneo
router.put('/tournament-result', async (req, res) => {
  try {
    const { champion, topScorer } = req.body;

    // Actualizar puntos de todas las predicciones del torneo
    const predictions = await TournamentPrediction.find();
    for (const pred of predictions) {
      if (champion) {
        pred.championPoints = calculateChampionPoints(pred.champion, champion);
      }
      if (topScorer) {
        pred.topScorerPoints = calculateTopScorerPoints(pred.topScorer, topScorer);
      }
      await pred.save();
    }

    res.json({
      message: 'Resultados del torneo actualizados',
      champion,
      topScorer,
      predictionsUpdated: predictions.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando resultado del torneo' });
  }
});

module.exports = router;
