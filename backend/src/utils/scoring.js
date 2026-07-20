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
 * Fases donde hay penales si hay empate al 90'
 */
const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third', 'final'];

function isKnockout(phase) {
  return KNOCKOUT_PHASES.includes(phase);
}

/**
 * Calcula puntos para partidos de eliminatorias (penales incluidos).
 * predPenalty / realPenalty: 'home' | 'away' | null
 *
 * Sistema:
 *   - Exacto al 90' + penales correctos (o no hubo penales): 3 pts
 *   - Exacto al 90' pero penales mal: 2 pts
 *   - Misma diferencia de goles al 90' (solo si no es empate): 2 pts
 *   - Ganador final correcto (contando penales): 1 pt
 *   - Resto: 0 pts
 */
function calculateKnockoutPoints(predHome, predAway, predPenalty, realHome, realAway, realPenalty) {
  const realDrawAt90 = realHome === realAway;
  const predDrawAt90 = predHome === predAway;

  // Ganador final real (considerando penales si hubo empate al 90')
  const realWinner = realDrawAt90 ? realPenalty : getResult(realHome, realAway);
  // Ganador final predicho
  const predWinner = predDrawAt90 ? predPenalty : getResult(predHome, predAway);

  // Exacto al 90'
  if (predHome === realHome && predAway === realAway) {
    if (realDrawAt90) {
      // Empate al 90': exacto + penales correctos = 3, penales mal = 2
      return predPenalty === realPenalty ? 3 : 2;
    }
    return 3;
  }

  // Misma diferencia de goles (solo partidos que no terminan en empate al 90')
  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;
  if (!realDrawAt90 && predDiff === realDiff && predDiff !== 0) {
    return 2;
  }

  // Ganador final correcto
  if (predWinner && realWinner && predWinner === realWinner) {
    return 1;
  }

  return 0;
}

/**
 * Normaliza un texto para comparar: sin acentos, minúsculas,
 * sin puntuación y con espacios colapsados.
 * "  Kylian  Mbappé " -> "kylian mbappe"
 */
function normalizeName(value) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')  // quitar acentos
    .toLowerCase()
    .replace(/[.,'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compara nombres de personas de forma tolerante: los usuarios escriben
 * el goleador a mano ("Mbappe", "K. Mbappé", "Kylian Mbappé").
 * Se considera acierto si los nombres normalizados coinciden o si
 * coincide el apellido (última palabra de al menos 3 letras).
 */
function namesMatch(predicted, actual) {
  const p = normalizeName(predicted);
  const a = normalizeName(actual);
  if (!p || !a) return false;
  if (p === a) return true;

  const lastName = (str) => {
    const parts = str.split(' ').filter(w => w.length >= 3);
    return parts.length ? parts[parts.length - 1] : '';
  };

  const pLast = lastName(p);
  const aLast = lastName(a);
  return !!pLast && pLast === aLast;
}

/**
 * Calcula puntos por campeón acertado
 */
function calculateChampionPoints(predicted, actual) {
  if (!predicted || !actual) return 0;
  return normalizeName(predicted) === normalizeName(actual) ? 5 : 0;
}

/**
 * Calcula puntos por goleador acertado
 */
function calculateTopScorerPoints(predicted, actual) {
  if (!predicted || !actual) return 0;
  return namesMatch(predicted, actual) ? 3 : 0;
}

/**
 * Calcula puntos por predicción de clasificados de grupo.
 * Sistema:
 *   - 1° lugar exacto: 3 pts
 *   - 2° lugar exacto: 2 pts
 *   - Equipo clasificó pero en posición contraria: 1 pt c/u
 * Máximo: 5 pts por grupo
 */
function calculateGroupPoints(predictedFirst, predictedSecond, actualFirst, actualSecond) {
  if (!predictedFirst || !predictedSecond || !actualFirst || !actualSecond) return 0;

  const pf = predictedFirst.toLowerCase().trim();
  const ps = predictedSecond.toLowerCase().trim();
  const af = actualFirst.toLowerCase().trim();
  const as = actualSecond.toLowerCase().trim();

  let points = 0;

  if (pf === af) points += 3;
  else if (pf === as) points += 1; // predijo 1° pero quedó 2°

  if (ps === as) points += 2;
  else if (ps === af) points += 1; // predijo 2° pero quedó 1°

  return points;
}

module.exports = {
  calculateMatchPoints,
  calculateKnockoutPoints,
  calculateChampionPoints,
  calculateTopScorerPoints,
  calculateGroupPoints,
  isKnockout,
  getResult,
  normalizeName,
  namesMatch
};
