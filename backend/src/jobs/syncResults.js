const cron = require('node-cron');
const Match = require('../models/Match');
const Prediction = require('../models/Prediction');
const { getSeasonMatches, getLastResults } = require('../services/sportsdbService');
const { calculateMatchPoints } = require('../utils/scoring');

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
        await Match.findByIdAndUpdate(existing._id, {
          status: event.status,
          homeScore: event.homeScore,
          awayScore: event.awayScore,
          homeFlag: event.homeFlag || existing.homeFlag,
          awayFlag: event.awayFlag || existing.awayFlag,
          round: event.round || existing.round
        });

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
 * Calcula los puntos de todas las predicciones para un partido finalizado
 */
async function calculatePredictionPoints(matchId, realHome, realAway) {
  try {
    const predictions = await Prediction.find({ matchId, points: null });
    for (const pred of predictions) {
      const points = calculateMatchPoints(pred.homeScore, pred.awayScore, realHome, realAway);
      pred.points = points;
      await pred.save();
    }
    console.log(`[SyncJob] Puntos calculados para ${predictions.length} predicciones del partido ${matchId}`);
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
