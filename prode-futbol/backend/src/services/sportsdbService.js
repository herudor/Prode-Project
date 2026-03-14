const axios = require('axios');

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';
const LEAGUE_ID = '4429';
const SEASON = '2026';

function getApiKey() {
  return process.env.SPORTSDB_API_KEY || '2';
}

function buildUrl(endpoint) {
  return `${BASE_URL}/${getApiKey()}/${endpoint}`;
}

/**
 * Mapea la fase del partido desde el nombre del round de TheSportsDB
 */
function mapPhase(round) {
  if (!round) return 'group';
  const r = round.toLowerCase();
  if (r.includes('group') || r.includes('grupo')) return 'group';
  if (r.includes('round of 16') || r.includes('octavo')) return 'round_of_16';
  if (r.includes('quarter') || r.includes('cuarto')) return 'quarter';
  if (r.includes('semi')) return 'semi';
  if (r.includes('third') || r.includes('tercer')) return 'third';
  if (r.includes('final')) return 'final';
  return 'group';
}

/**
 * Convierte un evento de TheSportsDB al formato de Match
 */
function mapEvent(event) {
  const homeScore = event.intHomeScore !== null && event.intHomeScore !== ''
    ? parseInt(event.intHomeScore) : null;
  const awayScore = event.intAwayScore !== null && event.intAwayScore !== ''
    ? parseInt(event.intAwayScore) : null;

  let status = 'upcoming';
  if (event.strStatus === 'Match Finished' || homeScore !== null) {
    status = 'finished';
  } else if (event.strStatus === 'In Progress' || event.strStatus === 'Live') {
    status = 'live';
  }

  return {
    externalId: event.idEvent,
    homeTeam: event.strHomeTeam,
    awayTeam: event.strAwayTeam,
    homeFlag: event.strHomeTeamBadge || null,
    awayFlag: event.strAwayTeamBadge || null,
    date: new Date(event.strTimestamp || `${event.dateEvent}T${event.strTime || '00:00:00'}Z`),
    status,
    homeScore,
    awayScore,
    round: event.strRound || event.intRound,
    phase: mapPhase(event.strRound || ''),
    group: event.strGroup || null
  };
}

/**
 * Obtiene todos los partidos de la temporada 2026
 */
async function getSeasonMatches() {
  try {
    const url = buildUrl(`eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`);
    const response = await axios.get(url, { timeout: 10000 });
    const events = response.data?.events || [];
    return events.map(mapEvent);
  } catch (err) {
    console.error('Error fetching season matches:', err.message);
    return [];
  }
}

/**
 * Obtiene los próximos partidos
 */
async function getNextMatches() {
  try {
    const url = buildUrl(`eventsnextleague.php?id=${LEAGUE_ID}`);
    const response = await axios.get(url, { timeout: 10000 });
    const events = response.data?.events || [];
    return events.map(mapEvent);
  } catch (err) {
    console.error('Error fetching next matches:', err.message);
    return [];
  }
}

/**
 * Obtiene los últimos resultados
 */
async function getLastResults() {
  try {
    const url = buildUrl(`eventslast.php?id=${LEAGUE_ID}`);
    const response = await axios.get(url, { timeout: 10000 });
    const events = response.data?.results || [];
    return events.map(mapEvent);
  } catch (err) {
    console.error('Error fetching last results:', err.message);
    return [];
  }
}

module.exports = {
  getSeasonMatches,
  getNextMatches,
  getLastResults,
  mapEvent
};
