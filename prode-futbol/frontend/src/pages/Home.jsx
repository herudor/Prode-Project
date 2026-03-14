import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatches, getPredictions, getLeaderboard } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import PredictionForm from '../components/PredictionForm';

export default function Home() {
  const { user } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchRes, predRes, lbRes] = await Promise.all([
        getMatches({ upcoming: true }),
        getPredictions(),
        getLeaderboard()
      ]);

      setUpcomingMatches(matchRes.data.slice(0, 6));

      const predMap = {};
      predRes.data.forEach(p => {
        if (p.matchId) predMap[p.matchId._id] = p;
      });
      setPredictions(predMap);
      setLeaderboard(lbRes.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionSaved = (pred) => {
    setPredictions(prev => ({ ...prev, [pred.matchId]: pred }));
    setSelectedMatch(null);
  };

  const userRank = leaderboard.find(e => e.userId?.toString() === user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Hola, <span className="text-primary-400">{user?.name}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1">Mundial 2026 · Bienvenido al prode</p>
      </div>

      {/* Stats cards */}
      {userRank && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-400">#{userRank.position}</p>
            <p className="text-xs text-gray-500 mt-1">Posición</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-yellow-400">{userRank.totalPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Puntos</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-400">{userRank.exactResults}</p>
            <p className="text-xs text-gray-500 mt-1">Exactos</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-blue-400">{userRank.totalPredictions}</p>
            <p className="text-xs text-gray-500 mt-1">Predicciones</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming matches */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Próximos partidos</h2>
            <Link to="/matches" className="text-sm text-primary-500 hover:text-primary-400">
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-400">No hay partidos próximos disponibles</p>
              <p className="text-gray-600 text-sm mt-1">Los partidos se sincronizan automáticamente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMatches.map(match => (
                <MatchCard
                  key={match._id}
                  match={match}
                  prediction={predictions[match._id]}
                  onPredict={setSelectedMatch}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top 5 leaderboard */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Top 5 Ranking</h2>
            <Link to="/leaderboard" className="text-sm text-primary-500 hover:text-primary-400">
              Ver completo →
            </Link>
          </div>

          <div className="card">
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">Sin datos todavía</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.userId?.toString() === user?.id;
                  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  return (
                    <div key={entry.userId} className={`flex items-center gap-3 ${isMe ? 'text-primary-400' : ''}`}>
                      <span className="text-lg w-7">{medals[i]}</span>
                      <span className="flex-1 font-medium text-sm truncate">{entry.name}</span>
                      <span className="font-bold">{entry.totalPoints} <span className="text-xs text-gray-500">pts</span></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="mt-4 space-y-2">
            <Link to="/tournament" className="card block hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-medium text-sm">Predicción del Torneo</p>
                  <p className="text-xs text-gray-500">Elegí campeón y goleador</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Prediction modal */}
      {selectedMatch && (
        <PredictionForm
          match={selectedMatch}
          existingPrediction={predictions[selectedMatch._id]}
          onSaved={handlePredictionSaved}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
