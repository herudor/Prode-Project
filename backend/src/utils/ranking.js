/**
 * Comparador del ranking general.
 * Orden: puntos desc -> resultados exactos desc -> aciertos totales desc -> nombre asc.
 */
function compareRankingEntries(a, b) {
  return (
    b.totalPoints - a.totalPoints ||
    b.exactResults - a.exactResults ||
    b.correctResults - a.correctResults ||
    a.name.localeCompare(b.name)
  );
}

module.exports = { compareRankingEntries };
