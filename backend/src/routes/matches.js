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

// GET /api/matches/groups-info — equipos por grupo con estado de lock
router.get('/groups-info', auth, async (req, res) => {
  try {
    const matches = await Match.find({ phase: 'group' }).sort({ date: 1 });
    const groups = {};

    for (const match of matches) {
      const g = match.group;
      if (!g) continue;
      if (!groups[g]) groups[g] = { teams: [], locked: false };

      const addTeam = (name, flag) => {
        if (name && !groups[g].teams.find(t => t.name === name)) {
          groups[g].teams.push({ name, flag: flag || null });
        }
      };
      addTeam(match.homeTeam, match.homeFlag);
      addTeam(match.awayTeam, match.awayFlag);

      if (match.status !== 'upcoming' || match.date <= new Date()) {
        groups[g].locked = true;
      }
    }

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo grupos' });
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
