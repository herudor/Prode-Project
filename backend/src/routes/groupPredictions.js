const express = require('express');
const router = express.Router();
const GroupPrediction = require('../models/GroupPrediction');
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// GET /api/group-predictions — predicciones de grupo del usuario
router.get('/', auth, async (req, res) => {
  try {
    const predictions = await GroupPrediction.find({ userId: req.user._id });
    res.json(predictions);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo predicciones de grupo' });
  }
});

// POST /api/group-predictions/:group — guardar predicción de grupo
router.post('/:group', auth, async (req, res) => {
  try {
    const { group } = req.params;
    const { first, second } = req.body;

    if (!first || !second) {
      return res.status(400).json({ message: 'first y second son requeridos' });
    }
    if (first === second) {
      return res.status(400).json({ message: 'No podés elegir el mismo equipo para ambas posiciones' });
    }

    // Bloquear si ya jugó algún partido en este grupo
    const lockedMatch = await Match.findOne({
      phase: 'group',
      group: group.toUpperCase(),
      $or: [
        { status: { $in: ['live', 'finished'] } },
        { date: { $lte: new Date() } }
      ]
    });

    if (lockedMatch) {
      return res.status(400).json({
        message: `Las predicciones del Grupo ${group.toUpperCase()} están cerradas`
      });
    }

    const prediction = await GroupPrediction.findOneAndUpdate(
      { userId: req.user._id, group: group.toUpperCase() },
      { first, second, points: null },
      { upsert: true, new: true }
    );

    res.json(prediction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error guardando predicción de grupo' });
  }
});

module.exports = router;
