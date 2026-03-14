import React, { useState } from 'react';
import { savePrediction } from '../services/api';

export default function PredictionForm({ match, existingPrediction, onSaved, onClose }) {
  const [homeScore, setHomeScore] = useState(existingPrediction?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(existingPrediction?.awayScore ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (homeScore === '' || awayScore === '') {
      return setError('Ingresa ambos marcadores');
    }
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      return setError('Los valores deben ser números positivos');
    }

    setLoading(true);
    setError('');
    try {
      const res = await savePrediction(match._id, home, away);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error guardando predicción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Predicción</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className="font-semibold text-center flex-1">{match.homeTeam}</span>
          <span className="text-gray-500">vs</span>
          <span className="font-semibold text-center flex-1">{match.awayTeam}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="number"
              min="0"
              max="20"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              placeholder="0"
              className="input-field text-center text-2xl font-bold"
            />
            <span className="text-gray-500 text-2xl font-bold">-</span>
            <input
              type="number"
              min="0"
              max="20"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              placeholder="0"
              className="input-field text-center text-2xl font-bold"
            />
          </div>

          {/* Scoring guide */}
          <div className="bg-gray-800 rounded-lg p-3 mb-4 text-xs text-gray-400 space-y-1">
            <p className="text-gray-300 font-medium mb-1">Sistema de puntos:</p>
            <p>🎯 Resultado exacto: <strong className="text-green-400">3 pts</strong></p>
            <p>📊 Diferencia correcta: <strong className="text-blue-400">2 pts</strong></p>
            <p>✅ Ganador/Empate: <strong className="text-yellow-400">1 pt</strong></p>
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
