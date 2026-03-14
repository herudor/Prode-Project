/**
 * Script para poblar la BD con datos de prueba
 * Uso: docker compose run --rm backend node src/scripts/seedTestData.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Match = require('../models/Match');

const now = new Date();
const h = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);

const matches = [
  // --- Fase de Grupos ---
  { homeTeam: 'Argentina', awayTeam: 'México',        phase: 'group', group: 'Grupo A', date: h(-48), status: 'finished', homeScore: 2, awayScore: 0 },
  { homeTeam: 'Polonia',   awayTeam: 'Arabia Saudita',phase: 'group', group: 'Grupo A', date: h(-48), status: 'finished', homeScore: 2, awayScore: 0 },
  { homeTeam: 'Argentina', awayTeam: 'Polonia',        phase: 'group', group: 'Grupo A', date: h(-24), status: 'finished', homeScore: 2, awayScore: 0 },
  { homeTeam: 'México',    awayTeam: 'Arabia Saudita', phase: 'group', group: 'Grupo A', date: h(-24), status: 'finished', homeScore: 2, awayScore: 1 },

  { homeTeam: 'Brasil',    awayTeam: 'Serbia',         phase: 'group', group: 'Grupo B', date: h(-36), status: 'finished', homeScore: 2, awayScore: 0 },
  { homeTeam: 'Suiza',     awayTeam: 'Camerún',        phase: 'group', group: 'Grupo B', date: h(-36), status: 'finished', homeScore: 1, awayScore: 0 },
  { homeTeam: 'Brasil',    awayTeam: 'Suiza',          phase: 'group', group: 'Grupo B', date: h(-12), status: 'finished', homeScore: 1, awayScore: 0 },

  { homeTeam: 'Francia',   awayTeam: 'Australia',      phase: 'group', group: 'Grupo C', date: h(-20), status: 'finished', homeScore: 4, awayScore: 1 },
  { homeTeam: 'Dinamarca', awayTeam: 'Túnez',          phase: 'group', group: 'Grupo C', date: h(-20), status: 'finished', homeScore: 0, awayScore: 0 },

  // --- Próximos (para predecir) ---
  { homeTeam: 'España',    awayTeam: 'Alemania',       phase: 'group', group: 'Grupo D', date: h(2),  status: 'upcoming' },
  { homeTeam: 'Japón',     awayTeam: 'Costa Rica',     phase: 'group', group: 'Grupo D', date: h(2),  status: 'upcoming' },
  { homeTeam: 'Bélgica',   awayTeam: 'Canadá',         phase: 'group', group: 'Grupo E', date: h(5),  status: 'upcoming' },
  { homeTeam: 'Marruecos', awayTeam: 'Croacia',        phase: 'group', group: 'Grupo E', date: h(5),  status: 'upcoming' },
  { homeTeam: 'Portugal',  awayTeam: 'Uruguay',        phase: 'group', group: 'Grupo H', date: h(26), status: 'upcoming' },
  { homeTeam: 'Ghana',     awayTeam: 'Corea del Sur',  phase: 'group', group: 'Grupo H', date: h(26), status: 'upcoming' },
  { homeTeam: 'Inglaterra','awayTeam': 'Senegal',      phase: 'group', group: 'Grupo F', date: h(50), status: 'upcoming' },
  { homeTeam: 'Países Bajos', awayTeam: 'Ecuador',     phase: 'group', group: 'Grupo F', date: h(50), status: 'upcoming' },

  // --- Eliminatorias ---
  { homeTeam: 'Argentina', awayTeam: 'Australia',      phase: 'round_of_16', date: h(74),  status: 'upcoming' },
  { homeTeam: 'Francia',   awayTeam: 'Polonia',        phase: 'round_of_16', date: h(74),  status: 'upcoming' },
  { homeTeam: 'Inglaterra', awayTeam: 'Senegal',       phase: 'round_of_16', date: h(98),  status: 'upcoming' },
  { homeTeam: 'Brasil',    awayTeam: 'Corea del Sur',  phase: 'round_of_16', date: h(98),  status: 'upcoming' },

  { homeTeam: 'Argentina', awayTeam: 'Países Bajos',   phase: 'quarter',     date: h(170), status: 'upcoming' },
  { homeTeam: 'Francia',   awayTeam: 'Inglaterra',     phase: 'quarter',     date: h(170), status: 'upcoming' },

  { homeTeam: 'Argentina', awayTeam: 'Francia',        phase: 'semi',        date: h(240), status: 'upcoming' },
  { homeTeam: 'Brasil',    awayTeam: 'España',         phase: 'semi',        date: h(240), status: 'upcoming' },

  { homeTeam: 'Francia',   awayTeam: 'Brasil',         phase: 'third',       date: h(310), status: 'upcoming' },
  { homeTeam: 'Argentina', awayTeam: 'España',         phase: 'final',       date: h(336), status: 'upcoming' },
];

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: No se puede correr seed en producción.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // Limpiar partidos existentes
  const deleted = await Match.deleteMany({});
  console.log(`Partidos eliminados: ${deleted.deletedCount}`);

  // Insertar partidos de prueba
  const inserted = await Match.insertMany(matches);
  console.log(`Partidos creados: ${inserted.length}`);

  console.log('\n=== Resumen ===');
  console.log(`  Finalizados:  ${matches.filter(m => m.status === 'finished').length}`);
  console.log(`  Próximos:     ${matches.filter(m => m.status === 'upcoming').length}`);
  console.log('\nListo. Podés iniciar sesión y predecir los partidos próximos.');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
