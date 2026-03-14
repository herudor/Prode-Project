const express = require('express');
const router = express.Router();
const Prediction = require('../models/Prediction');
const TournamentPrediction = require('../models/TournamentPrediction');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/leaderboard - tabla de ranking
router.get('/', auth, async (req, res) => {
  try {
    // Agregación: sumar puntos por usuario
    const matchPoints = await Prediction.aggregate([
      { $match: { points: { $ne: null } } },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$points' },
          totalPredictions: { $sum: 1 },
          exactResults: { $sum: { $cond: [{ $eq: ['$points', 3] }, 1, 0] } },
          correctResults: { $sum: { $cond: [{ $gte: ['$points', 1] }, 1, 0] } }
        }
      }
    ]);

    // Puntos del torneo (campeón + goleador)
    const tournamentPoints = await TournamentPrediction.find({
      $or: [{ championPoints: { $gt: 0 } }, { topScorerPoints: { $gt: 0 } }]
    });

    const tournamentMap = {};
    tournamentPoints.forEach(tp => {
      tournamentMap[tp.userId.toString()] = (tp.championPoints || 0) + (tp.topScorerPoints || 0);
    });

    // Construir mapa de puntos
    const pointsMap = {};
    matchPoints.forEach(mp => {
      pointsMap[mp._id.toString()] = {
        totalPoints: mp.totalPoints + (tournamentMap[mp._id.toString()] || 0),
        totalPredictions: mp.totalPredictions,
        exactResults: mp.exactResults,
        correctResults: mp.correctResults
      };
    });

    // Agregar usuarios con solo puntos del torneo
    Object.keys(tournamentMap).forEach(uid => {
      if (!pointsMap[uid]) {
        pointsMap[uid] = {
          totalPoints: tournamentMap[uid],
          totalPredictions: 0,
          exactResults: 0,
          correctResults: 0
        };
      }
    });

    // Obtener info de usuarios
    const userIds = Object.keys(pointsMap);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');

    const leaderboard = users.map(user => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      ...pointsMap[user._id.toString()]
    }));

    // Ordenar por puntos desc
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Agregar posición
    leaderboard.forEach((entry, index) => {
      entry.position = index + 1;
    });

    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo ranking' });
  }
});

module.exports = router;
