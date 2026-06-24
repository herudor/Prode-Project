import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/api';
import LeaderboardTable from '../components/LeaderboardTable';

export default function Leaderboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getLeaderboard()
      .then(res => setData(res.data))
      .catch(() => setError('Error cargando el ranking'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? data.filter(e =>
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.sector?.toLowerCase().includes(search.toLowerCase())
      )
    : data;

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
        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar jugador o sector..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {search && (
          <p className="text-xs text-gray-500 mb-3">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search}"
          </p>
        )}

        <LeaderboardTable data={filtered} loading={loading} highlightSearch={search} />
      </div>
    </div>
  );
}
