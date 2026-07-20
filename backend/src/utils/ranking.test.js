const test = require('node:test');
const assert = require('node:assert');
const { compareRankingEntries } = require('./ranking');

const entry = (name, totalPoints, exactResults, correctResults = 0) =>
  ({ name, totalPoints, exactResults, correctResults });

test('ordena por puntos descendente', () => {
  const rows = [entry('B', 100, 5), entry('A', 158, 14), entry('C', 159, 16)];
  rows.sort(compareRankingEntries);
  assert.deepStrictEqual(rows.map(r => r.name), ['C', 'A', 'B']);
});

test('empate en puntos: desempata por resultados exactos', () => {
  // Caso real: tres usuarios empatados en 159 pts
  const rows = [
    entry('Matias Dengra', 159, 16),
    entry('Augusto silvero', 159, 19),
    entry('Melani Moreyra', 159, 14)
  ];
  rows.sort(compareRankingEntries);
  assert.deepStrictEqual(
    rows.map(r => r.name),
    ['Augusto silvero', 'Matias Dengra', 'Melani Moreyra']
  );
});

test('empate en puntos y exactos: desempata por aciertos totales', () => {
  const rows = [entry('A', 159, 14, 60), entry('B', 159, 14, 72)];
  rows.sort(compareRankingEntries);
  assert.deepStrictEqual(rows.map(r => r.name), ['B', 'A']);
});

test('empate total: orden alfabetico estable', () => {
  const rows = [entry('Zoe', 100, 5, 20), entry('Ana', 100, 5, 20)];
  rows.sort(compareRankingEntries);
  assert.deepStrictEqual(rows.map(r => r.name), ['Ana', 'Zoe']);
});
