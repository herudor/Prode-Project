const test = require('node:test');
const assert = require('node:assert');
const {
  calculateChampionPoints,
  calculateTopScorerPoints,
  normalizeName,
  namesMatch
} = require('./scoring');

test('normalizeName quita acentos, mayúsculas y espacios sobrantes', () => {
  assert.strictEqual(normalizeName('  Kylian  Mbappé '), 'kylian mbappe');
  assert.strictEqual(normalizeName('ESPAÑA'), 'espana');
  assert.strictEqual(normalizeName(null), '');
});

test('campeón: acierta con variantes de acento y mayúsculas', () => {
  assert.strictEqual(calculateChampionPoints('España', 'España'), 5);
  assert.strictEqual(calculateChampionPoints('espana', 'España'), 5);
  assert.strictEqual(calculateChampionPoints('  ESPAÑA ', 'España'), 5);
});

test('campeón: no acierta con otro equipo', () => {
  assert.strictEqual(calculateChampionPoints('Argentina', 'España'), 0);
  assert.strictEqual(calculateChampionPoints('', 'España'), 0);
  assert.strictEqual(calculateChampionPoints('España', null), 0);
});

test('goleador: acierta escribiendo solo el apellido o el nombre completo', () => {
  const real = 'Kylian Mbappé';
  assert.strictEqual(calculateTopScorerPoints('Kylian Mbappé', real), 3);
  assert.strictEqual(calculateTopScorerPoints('kylian mbappe', real), 3);
  assert.strictEqual(calculateTopScorerPoints('Mbappe', real), 3);
  assert.strictEqual(calculateTopScorerPoints('Mbappé', real), 3);
  assert.strictEqual(calculateTopScorerPoints('K. Mbappé', real), 3);
  assert.strictEqual(calculateTopScorerPoints('  MBAPPE  ', real), 3);
});

test('goleador: no acierta con otro jugador', () => {
  const real = 'Kylian Mbappé';
  assert.strictEqual(calculateTopScorerPoints('Lionel Messi', real), 0);
  assert.strictEqual(calculateTopScorerPoints('Kylian Haaland', real), 0);
  assert.strictEqual(calculateTopScorerPoints('', real), 0);
  assert.strictEqual(calculateTopScorerPoints('Mbappe', null), 0);
});

test('namesMatch no matchea por nombre de pila suelto', () => {
  // "Kylian" solo no debe dar por acertado a Mbappé
  assert.strictEqual(namesMatch('Kylian', 'Kylian Mbappé'), false);
});
