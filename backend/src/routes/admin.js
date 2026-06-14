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
const { calculateChampionPoints, calculateTopScorerPoints, calculateGroupPoints } = require('../utils/scoring');
const GroupPrediction = require('../models/GroupPrediction');

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

// PUT /api/admin/users/:id - editar datos de un usuario
router.put('/users/:id', async (req, res) => {
  try {
    const { name, sector, email } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'El nombre es requerido' });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), sector: (sector || '').trim(), ...(email ? { email: email.trim().toLowerCase() } : {}) },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error actualizando usuario' });
  }
});

// POST /api/admin/users/:id/reset-password - resetear contraseña
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Contraseña debe tener al menos 6 caracteres' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Contraseña reseteada correctamente' });
  } catch (err) {
    res.status(500).json({ message: 'Error reseteando contraseña' });
  }
});

// PATCH /api/admin/users/:id/toggle - activar/desactivar usuario
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (user.role === 'admin') return res.status(400).json({ message: 'No se puede desactivar al admin' });
    user.active = !user.active;
    await user.save();
    res.json({ message: `Usuario ${user.active ? 'activado' : 'desactivado'}`, active: user.active });
  } catch (err) {
    res.status(500).json({ message: 'Error actualizando usuario' });
  }
});

// GET /api/admin/predictions-summary - predicciones de partidos finalizados
router.get('/predictions-summary', async (req, res) => {
  try {
    const finishedMatches = await Match.find({ status: 'finished' }).sort({ date: -1 }).lean();
    const users = await User.find({ active: { $ne: false } }).select('name sector').lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const result = await Promise.all(finishedMatches.map(async (match) => {
      const preds = await Prediction.find({ matchId: match._id }).lean();
      return {
        match: {
          _id: match._id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          date: match.date,
          phase: match.phase,
          group: match.group
        },
        predictions: preds.map(p => ({
          user: userMap[p.userId.toString()] || { name: 'Usuario eliminado', sector: '' },
          homeScore: p.homeScore,
          awayScore: p.awayScore,
          points: p.points
        })).sort((a, b) => (b.points ?? -1) - (a.points ?? -1)),
        totalPredictions: preds.length,
        noPrediction: users.filter(u => !preds.find(p => p.userId.toString() === u._id.toString())).map(u => u.name)
      };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo predicciones' });
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

// PUT /api/admin/group-result/:group — definir 1° y 2° de un grupo y puntuar predicciones
router.put('/group-result/:group', async (req, res) => {
  try {
    const group = req.params.group.toUpperCase();
    const { first, second } = req.body;
    if (!first || !second) {
      return res.status(400).json({ message: 'first y second son requeridos' });
    }

    const predictions = await GroupPrediction.find({ group });
    for (const pred of predictions) {
      pred.points = calculateGroupPoints(pred.first, pred.second, first, second);
      await pred.save();
    }

    res.json({
      message: `Grupo ${group} actualizado`,
      first,
      second,
      predictionsUpdated: predictions.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando resultado del grupo' });
  }
});

module.exports = router;
