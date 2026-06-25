const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Match = require('../models/Match');
const GroupResult = require('../models/GroupResult');
const { getGroupStandings } = require('../services/sportsdbService');

// GET /api/groups/standings
// Calcula posiciones de cada grupo desde la colección de partidos.
// Si no hay datos propios, hace fallback a la API externa.
router.get('/standings', auth, async (req, res) => {
  try {
    const groupMatches = await Match.find({ phase: 'group' }).lean();

    if (groupMatches.length === 0) {
      // Fallback: pedir standings a worldcup26.ir directamente
      const external = await getGroupStandings();
      return res.json(external);
    }

    // Construir standings desde los partidos de la BD
    const groupMap = {}; // { 'A': { 'Mexico': { stats } } }

    for (const match of groupMatches) {
      const grp = match.group || 'X';
      if (!groupMap[grp]) groupMap[grp] = {};

      const addTeam = (name, flag) => {
        if (!groupMap[grp][name]) {
          groupMap[grp][name] = { name, flag: flag || null, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
        }
      };

      addTeam(match.homeTeam, match.homeFlag);
      addTeam(match.awayTeam, match.awayFlag);

      if (match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
        const ht = groupMap[grp][match.homeTeam];
        const at = groupMap[grp][match.awayTeam];
        ht.mp++; at.mp++;
        ht.gf += match.homeScore; ht.ga += match.awayScore;
        at.gf += match.awayScore; at.ga += match.homeScore;
        if (match.homeScore > match.awayScore) {
          ht.w++; ht.pts += 3; at.l++;
        } else if (match.homeScore < match.awayScore) {
          at.w++; at.pts += 3; ht.l++;
        } else {
          ht.d++; ht.pts++; at.d++; at.pts++;
        }
      }
    }

    const result = Object.keys(groupMap).sort().map(grpName => {
      const teams = Object.values(groupMap[grpName])
        .map(t => ({ ...t, gd: t.gf - t.ga }))
        .sort((a, b) =>
          b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name)
        );
      return { name: grpName, teams };
    });

    res.json(result);
  } catch (err) {
    console.error('[groups/standings]', err.message);
    res.status(500).json({ message: 'Error obteniendo standings' });
  }
});

// GET /api/groups/results — resultados reales de cada grupo (para mostrar a usuarios)
router.get('/results', auth, async (req, res) => {
  try {
    const results = await GroupResult.find().sort({ group: 1 }).lean();
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error obteniendo resultados de grupo' });
  }
});

module.exports = router;
