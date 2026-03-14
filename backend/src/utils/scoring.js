/**
 * Calcula el resultado de un marcador
 * @returns 'home' | 'away' | 'draw'
 */
function getResult(home, away) {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

/**
 * Calcula los puntos de una predicción de partido
 * @param {number} predHome - Goles predichos equipo local
 * @param {number} predAway - Goles predichos equipo visitante
 * @param {number} realHome - Goles reales equipo local
 * @param {number} realAway - Goles reales equipo visitante
 * @returns {number} Puntos obtenidos (0, 1, 2 o 3)
 */
function calculateMatchPoints(predHome, predAway, realHome, realAway) {
  // Resultado exacto
  if (predHome === realHome && predAway === realAway) {
    return 3;
  }

  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;

  // Diferencia de goles correcta (ej: 2-0 pred, 3-0 real -> diff = +2 vs +3, no aplica)
  // La diferencia exacta: 2-0 pred = +2, 3-0 real = +3 -> distinto
  // Pero 3-1 pred = +2, 2-0 real = +2 -> aplica
  if (predDiff === realDiff && predDiff !== 0) {
    return 2;
  }

  // Ganador o empate correcto
  const predResult = getResult(predHome, predAway);
  const realResult = getResult(realHome, realAway);
  if (predResult === realResult) {
    return 1;
  }

  return 0;
}

/**
 * Calcula puntos por campeón acertado
 */
function calculateChampionPoints(predicted, actual) {
  if (!predicted || !actual) return 0;
  return predicted.toLowerCase().trim() === actual.toLowerCase().trim() ? 5 : 0;
}

/**
 * Calcula puntos por goleador acertado
 */
function calculateTopScorerPoints(predicted, actual) {
  if (!predicted || !actual) return 0;
  return predicted.toLowerCase().trim() === actual.toLowerCase().trim() ? 3 : 0;
}

module.exports = {
  calculateMatchPoints,
  calculateChampionPoints,
  calculateTopScorerPoints,
  getResult
};
