require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { startSyncJob } = require('./jobs/syncResults');

const app = express();

// Middlewares
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origen no permitido'));
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Conexión a MongoDB e inicio del servidor
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado a MongoDB');
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
      startSyncJob();
    });
  })
  .catch(err => {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
