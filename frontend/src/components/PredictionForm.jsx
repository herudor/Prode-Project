import React, { useState } from 'react';
import { savePrediction } from '../services/api';

const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third', 'final'];

export default function PredictionForm({ match, existingPrediction, onSaved, onClose }) {
  const [homeScore, setHomeScore] = useState(existingPrediction?.homeScore ?? '');
  const [awayScore, setAwayScore] = useState(existingPrediction?.awayScore ?? '');
  const [penaltyWinner, setPenaltyWinner] = useState(existingPrediction?.penaltyWinner ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isKnockout = KNOCKOUT_PHASES.includes(match.phase);
  const isDraw = homeScore !== '' && awayScore !== '' && parseInt(homeScore) === parseInt(awayScore);
  const needsPenalty = isKnockout && isDraw;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (homeScore === '' || awayScore === '') return setError('Ingresá ambos marcadores');
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return setError('Los valores deben ser números positivos');
    if (needsPenalty && !penaltyWinner) return setError('Indicá quién gana en penales');

    setLoading(true);
    setError('');
    try {
      const res = await savePrediction(match._id, home, away, needsPenalty ? penaltyWinner : null);
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

        {isKnockout && (
          <p className="text-xs text-yellow-400/80 text-center mb-4 bg-yellow-400/10 rounded-lg py-2 px-3">
            Partido de eliminatoria — si predices empate, elegís quien gana en penales
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="number" min="0" max="20"
              value={homeScore}
              onChange={e => { setHomeScore(e.target.value); setPenaltyWinner(null); }}
              placeholder="0"
              className="input-field text-center text-2xl font-bold"
            />
            <span className="text-gray-500 text-2xl font-bold">-</span>
            <input
              type="number" min="0" max="20"
              value={awayScore}
              onChange={e => { setAwayScore(e.target.value); setPenaltyWinner(null); }}
              placeholder="0"
              className="input-field text-center text-2xl font-bold"
            />
          </div>

          {/* Selector de penales (solo aparece en eliminatorias con empate) */}
          {needsPenalty && (
            <div className="mb-4">
              <p className="text-sm text-gray-300 text-center mb-2">Empate — ¿Quién gana en penales?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPenaltyWinner('home')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    penaltyWinner === 'home'
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {match.homeTeam}
                </button>
                <button
                  type="button"
                  onClick={() => setPenaltyWinner('away')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    penaltyWinner === 'away'
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {match.awayTeam}
                </button>
              </div>
            </div>
          )}

          {/* Scoring guide */}
          <div className="bg-gray-800 rounded-lg p-3 mb-4 text-xs text-gray-400 space-y-1">
            <p className="text-gray-300 font-medium mb-1">Sistema de puntos:</p>
            <p>🎯 Resultado exacto: <strong className="text-green-400">3 pts</strong></p>
            <p>📊 Diferencia correcta: <strong className="text-blue-400">2 pts</strong></p>
            <p>✅ Ganador correcto: <strong className="text-yellow-400">1 pt</strong></p>
            {isKnockout && (
              <p>🔫 Exacto al 90' pero penales mal: <strong className="text-orange-400">2 pts</strong></p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
