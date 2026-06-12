const axios = require('axios');

const BASE_URL = 'https://worldcup26.ir';

function mapPhase(type) {
  switch ((type || '').toLowerCase()) {
    case 'group': return 'group';
    case 'r32':   return 'round_of_32';
    case 'r16':   return 'round_of_16';
    case 'qf':    return 'quarter';
    case 'sf':    return 'semi';
    case 'third': case '3rd': return 'third';
    case 'final': return 'final';
    default:      return 'group';
  }
}

// UTC offsets por estadio (horario de verano, junio-julio 2026)
// México no tiene DST desde 2023: CST = UTC-6 todo el año
// US Eastern (EDT) = UTC-4, US Central (CDT) = UTC-5, US/CA Pacific (PDT) = UTC-7
const STADIUM_OFFSET = {
  '1': -6, '2': -6, '3': -6,                    // Mexico City, Guadalajara, Monterrey
  '4': -5, '5': -5, '6': -5,                    // Dallas, Houston, Kansas City
  '7': -4, '8': -4, '9': -4, '10': -4,          // Atlanta, Miami, Boston, Philadelphia
  '11': -4, '12': -4,                            // New York, Toronto
  '13': -7, '14': -7, '15': -7, '16': -7        // Vancouver, Seattle, San Francisco, Los Angeles
};

function parseDate(localDate, stadiumId) {
  if (!localDate) return new Date();
  const [datePart, timePart = '00:00'] = localDate.split(' ');
  const [month, day, year] = datePart.split('/');
  const offset = STADIUM_OFFSET[String(stadiumId)] ?? -6;
  const sign = offset < 0 ? '-' : '+';
  const pad = String(Math.abs(offset)).padStart(2, '0');
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${timePart}:00${sign}${pad}:00`);
}

function mapMatch(m) {
  const isKnockout = m.type !== 'group';
  const homeTeamLabel = m.home_team_label || null;
  const awayTeamLabel = m.away_team_label || null;

  const homeTeam = m.home_team_name_en || homeTeamLabel || 'TBD';
  const awayTeam = m.away_team_name_en || awayTeamLabel || 'TBD';

  const finished = String(m.finished).toUpperCase() === 'TRUE';
  const elapsed = String(m.time_elapsed || '').toLowerCase();
  const inProgress = ['live', 'inprogress', 'ht', 'et', 'p'].includes(elapsed) || /^\d+$/.test(elapsed);
  const matchDate = parseDate(m.local_date, m.stadium_id);
  // Si ya pasó la hora de inicio y la API aún no actualizó, forzar live
  const datePassed = matchDate <= new Date();

  let status = 'upcoming';
  if (finished) status = 'finished';
  else if (inProgress || datePassed) status = 'live';

  // Mostrar marcador solo cuando la API lo confirma (evita mostrar 0-0 falso)
  const showScore = finished || inProgress;

  return {
    externalId: `wc26_${m.id}`,
    homeTeam,
    awayTeam,
    homeTeamLabel,
    awayTeamLabel,
    homeFlag: null,
    awayFlag: null,
    date: parseDate(m.local_date, m.stadium_id),
    status,
    homeScore: showScore ? parseInt(m.home_score || '0', 10) : null,
    awayScore: showScore ? parseInt(m.away_score || '0', 10) : null,
    phase: mapPhase(m.type),
    group: m.group || null,
    round: m.matchday ? String(m.matchday) : null
  };
}

async function getSeasonMatches() {
  try {
    const res = await axios.get(`${BASE_URL}/get/games`, { timeout: 10000 });
    const data = res.data || {};
    const games = Array.isArray(data) ? data : (data.games || data.matches || Object.values(data).find(Array.isArray) || []);
    return games.map(mapMatch);
  } catch (err) {
    console.error('[worldcup26] Error fetching games:', err.message);
    return [];
  }
}

async function getGroupStandings() {
  try {
    const [groupsRes, teamsRes] = await Promise.all([
      axios.get(`${BASE_URL}/get/groups`, { timeout: 10000 }),
      axios.get(`${BASE_URL}/get/teams`, { timeout: 10000 })
    ]);

    const groups = groupsRes.data?.groups || groupsRes.data || [];
    const teams = Array.isArray(teamsRes.data) ? teamsRes.data :
                  teamsRes.data?.teams || Object.values(teamsRes.data || {});

    const teamMap = {};
    teams.forEach(t => { teamMap[String(t.id || t._id)] = t; });

    return groups.map(g => ({
      name: g.name,
      teams: (g.teams || []).map(entry => {
        const team = teamMap[String(entry.team_id)] || {};
        return {
          team_id: entry.team_id,
          name: team.name_en || team.name || `Team ${entry.team_id}`,
          flag: team.flag || team.logo || null,
          mp:  parseInt(entry.mp  || '0', 10),
          w:   parseInt(entry.w   || '0', 10),
          d:   parseInt(entry.d   || '0', 10),
          l:   parseInt(entry.l   || '0', 10),
          gf:  parseInt(entry.gf  || '0', 10),
          ga:  parseInt(entry.ga  || '0', 10),
          gd:  parseInt(entry.gd  || '0', 10),
          pts: parseInt(entry.pts || '0', 10)
        };
      })
    }));
  } catch (err) {
    console.error('[worldcup26] Error fetching group standings:', err.message);
    return [];
  }
}

module.exports = { getSeasonMatches, getGroupStandings };
