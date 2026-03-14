import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';
import LeaderboardTable from '../components/LeaderboardTable';

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeaderboard()
      .then(res => setData(res.data))
      .catch(() => setError('Error cargando el ranking'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏆</span>
        <h1 className="text-2xl font-bold">Ranking General</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Scoring info */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-3 text-gray-300">Sistema de puntuación</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { pts: 3, label: 'Resultado exacto', color: 'text-green-400', bg: 'bg-green-400/10' },
            { pts: 2, label: 'Diferencia correcta', color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { pts: 1, label: 'Ganador/Empate', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { pts: 5, label: 'Campeón acertado', color: 'text-purple-400', bg: 'bg-purple-400/10' }
          ].map(item => (
            <div key={item.pts} className={`${item.bg} rounded-lg p-3 text-center`}>
              <p className={`text-2xl font-bold ${item.color}`}>{item.pts}</p>
              <p className="text-xs text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <LeaderboardTable data={data} loading={loading} />
      </div>
    </div>
  );
}
