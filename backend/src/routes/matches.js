const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const auth = require('../middleware/auth');

// GET /api/matches - listar partidos con filtros opcionales
router.get('/', auth, async (req, res) => {
  try {
    const { phase, status, upcoming } = req.query;
    const filter = {};

    if (phase) filter.phase = phase;
    if (status) filter.status = status;
    if (upcoming === 'true') {
      filter.status = 'upcoming';
      filter.date = { $gte: new Date() };
    }

    const matches = await Match.find(filter).sort({ date: 1 });
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo partidos' });
  }
});

// GET /api/matches/:id - obtener partido por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Partido no encontrado' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo partido' });
  }
});

module.exports = router;
