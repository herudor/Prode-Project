const cron = require('node-cron');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const { getSeasonMatches } = require('../services/sportsdbService');
const { calculateMatchPoints, calculateKnockoutPoints, isKnockout } = require('../utils/scoring');

/**
 * Sincroniza/actualiza partidos en la BD desde TheSportsDB
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
        // Solo actualizar scores si la API los provee (no sobreescribir con null)
        if (event.homeScore !== null) update.homeScore = event.homeScore;
        if (event.awayScore !== null) update.awayScore = event.awayScore;
        // Actualizar nombre de equipo en eliminatorias cuando ya se definió
        if (event.homeTeam && event.homeTeam !== 'TBD') update.homeTeam = event.homeTeam;
        if (event.awayTeam && event.awayTeam !== 'TBD') update.awayTeam = event.awayTeam;
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
