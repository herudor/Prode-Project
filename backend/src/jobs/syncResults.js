const cron = require('node-cron');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const { getSeasonMatches } = require('../services/sportsdbService');
const { calculateMatchPoints, calculateKnockoutPoints, isKnockout } = require('../utils/scoring');

// Detecta si un nombre de equipo es un placeholder sin resolver
function isPlaceholderName(name) {
  return !name || name === 'TBD' || /^(Winner|Loser|Runner|3rd) Match \d+/i.test(name);
}

/**
 * Resuelve "Winner Match 101" o "Loser Match 101" buscando en la BD
 * el partido wc26_101 ya finalizado y devolviendo el equipo ganador o perdedor.
 */
async function resolveTeamFromLabel(label) {
  if (!label) return null;
  const winnerM = label.match(/^Winner Match (\d+)$/i);
  const loserM  = label.match(/^Loser Match (\d+)$/i);
  const ref = winnerM || loserM;
  if (!ref) return null;

  const srcMatch = await Match.findOne({ externalId: `wc26_${ref[1]}`, status: 'finished' });
  if (!srcMatch || srcMatch.homeScore === null) return null;

  const homeWins = srcMatch.homeScore > srcMatch.awayScore
    || (srcMatch.homeScore === srcMatch.awayScore && srcMatch.penaltyWinner === 'home');
  const winner = homeWins ? srcMatch.homeTeam : srcMatch.awayTeam;
  const loser  = homeWins ? srcMatch.awayTeam : srcMatch.homeTeam;

  return winnerM ? winner : loser;
}

/**
 * Sincroniza/actualiza partidos en la BD desde la API externa
 */
async function syncMatches() {
  console.log('[SyncJob] Iniciando sincronización de partidos...');
  try {
    const events = await getSeasonMatches();
    if (!events.length) {
      console.log('[SyncJob] No se obtuvieron partidos de la API');
      return;
    }

    for (const event of events) {
      const existing = await Match.findOne({ externalId: event.externalId });

      if (!existing) {
        await Match.create(event);
        console.log(`[SyncJob] Partido creado: ${event.homeTeam} vs ${event.awayTeam}`);
      } else {
        const wasFinished = existing.status === 'finished';
        const update = {
          status: event.status,
          homeFlag: event.homeFlag || existing.homeFlag,
          awayFlag: event.awayFlag || existing.awayFlag,
          round: event.round || existing.round,
          homeTeamLabel: event.homeTeamLabel || existing.homeTeamLabel,
          awayTeamLabel: event.awayTeamLabel || existing.awayTeamLabel,
        };

        // Solo actualizar scores si la API los provee
        if (event.homeScore !== null) update.homeScore = event.homeScore;
        if (event.awayScore !== null) update.awayScore = event.awayScore;

        // Actualizar nombre de equipo: primero intentar con la API,
        // si sigue siendo placeholder intentar resolver desde la BD
        for (const side of ['homeTeam', 'awayTeam']) {
          const apiName = event[side];
          const currentName = existing[side];
          if (!isPlaceholderName(apiName)) {
            update[side] = apiName;                          // API ya tiene el nombre real
          } else if (isPlaceholderName(currentName)) {
            const resolved = await resolveTeamFromLabel(apiName || currentName);
            if (resolved) {
              update[side] = resolved;
              console.log(`[SyncJob] Equipo resuelto desde BD: ${resolved} (${apiName || currentName})`);
            }
          }
        }

        await Match.findByIdAndUpdate(existing._id, update);

        // Si el partido acaba de terminar, calcular puntos
        if (!wasFinished && event.status === 'finished' &&
            event.homeScore !== null && event.awayScore !== null) {
          await calculatePredictionPoints(existing._id, event.homeScore, event.awayScore);
        }
      }
    }
    console.log('[SyncJob] Sincronización completada');
  } catch (err) {
    console.error('[SyncJob] Error durante sincronización:', err.message);
  }
}

/**
 * Calcula los puntos de todas las predicciones para un partido finalizado.
 * forceRecalc=true recalcula incluso predicciones que ya tenían puntos (ej: corrección de score).
 */
async function calculatePredictionPoints(matchId, realHome, realAway, forceRecalc = false) {
  try {
    const match = await Match.findById(matchId);
    const knockout = match && isKnockout(match.phase);
    const realPenalty = match ? match.penaltyWinner : null;

    const query = forceRecalc ? { matchId } : { matchId, points: null };
    const predictions = await Prediction.find(query);
    for (const pred of predictions) {
      const points = knockout
        ? calculateKnockoutPoints(pred.homeScore, pred.awayScore, pred.penaltyWinner, realHome, realAway, realPenalty)
        : calculateMatchPoints(pred.homeScore, pred.awayScore, realHome, realAway);
      pred.points = points;
      await pred.save();
    }
    console.log(`[SyncJob] Puntos calculados para ${predictions.length} predicciones del partido ${matchId}${forceRecalc ? ' (recálculo forzado)' : ''}`);
  } catch (err) {
    console.error('[SyncJob] Error calculando puntos:', err.message);
  }
}

/**
 * Inicia el cron job
 * - Durante el torneo: cada 5 minutos
 * - Para simplicidad, usamos cada 5 minutos siempre
 */
function startSyncJob() {
  // Cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    await syncMatches();
  });

  console.log('[SyncJob] Cron job iniciado (cada 5 minutos)');
}

module.exports = { startSyncJob, syncMatches, calculatePredictionPoints };
