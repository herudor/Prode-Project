import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatches, getPredictions, getLeaderboard } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import PredictionForm from '../components/PredictionForm';

// ─── Sistema de puntos ────────────────────────────────────────────────────────
function ScoreRow({ pts, color, label }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`font-bold text-sm w-7 text-right flex-shrink-0 ${color}`}>{pts}</span>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  );
}

function ScoringSystem() {
  return (
    <div className="card mb-8">
      <h2 className="font-bold text-base mb-4 flex items-center gap-2">
        <span>📋</span> Sistema de puntos
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Partidos */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-800">Partidos</p>
          <ScoreRow pts="3" color="text-green-400"  label="Resultado exacto" />
          <ScoreRow pts="2" color="text-blue-400"   label="Diferencia de goles igual" />
          <ScoreRow pts="1" color="text-yellow-400" label="Ganador o empate correcto" />
          <ScoreRow pts="0" color="text-gray-600"   label="Predicción incorrecta" />
        </div>

        {/* Grupos */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-800">Grupos</p>
          <ScoreRow pts="5"   color="text-green-400"  label="Ambos clasificados en orden exacto" />
          <ScoreRow pts="3"   color="text-blue-400"   label="1° exacto, 2° intercambiado" />
          <ScoreRow pts="1–2" color="text-yellow-400" label="Un equipo correcto" />
          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
            <span>🔒</span> Se cierra antes del primer partido de cada grupo
          </p>
        </div>

        {/* Torneo */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 pb-1 border-b border-gray-800">Torneo</p>
          <ScoreRow pts="5" color="text-green-400" label="Campeón correcto" />
          <ScoreRow pts="3" color="text-blue-400"  label="Goleador correcto" />
          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
            <span>🔒</span> Se cierra antes del primer partido del mundial
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 flex items-start gap-2 text-xs text-gray-500">
        <span className="flex-shrink-0">⏱️</span>
        <p>Las predicciones de partido se cierran automáticamente al inicio de cada encuentro. No se pueden modificar una vez comenzado.</p>
      </div>
    </div>
  );
}

// ─── Ranking ──────────────────────────────────────────────────────────────────
function RankingSection({ leaderboard, userId }) {
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Ranking</h2>
        <Link to="/leaderboard" className="text-sm text-primary-500 hover:text-primary-400 transition-colors">
          Ver completo →
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        {leaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Sin datos todavía — jugá tus primeras predicciones</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-800">
                <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
                <th className="py-2 px-2 text-left">Jugador</th>
                <th className="py-2 px-3 text-center">Exactos</th>
                <th className="py-2 px-3 text-center">Pred.</th>
                <th className="py-2 pr-4 pl-2 text-right font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId?.toString() === userId;
                return (
                  <tr
                    key={entry.userId}
                    className={`border-b border-gray-800/50 last:border-0 transition-colors ${isMe ? 'bg-primary-500/10' : 'hover:bg-gray-800/40'}`}
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <span className="text-base">{medals[i] || <span className="text-gray-500 font-bold text-sm">{i + 1}</span>}</span>
                      {!medals[i] && <span className="text-gray-500 font-bold text-sm">{i + 1}</span>}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`font-medium text-sm ${isMe ? 'text-primary-400' : 'text-white'}`}>
                        {entry.name} {isMe && <span className="text-xs text-primary-500">(vos)</span>}
                      </span>
                      {entry.sector && <p className="text-xs text-gray-500">{entry.sector}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-sm text-green-400">{entry.exactResults}</td>
                    <td className="py-2.5 px-3 text-center text-sm text-gray-400">{entry.totalPredictions}</td>
                    <td className="py-2.5 pr-4 pl-2 text-right font-bold text-white">{entry.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="px-4 py-3 border-t border-gray-800 text-center">
          <Link to="/leaderboard" className="text-sm text-primary-500 hover:text-primary-400 transition-colors font-medium">
            Ver ranking completo →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Próximos partidos ────────────────────────────────────────────────────────
function UpcomingSection({ matches, predictions, onPredict, loading }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Próximos partidos</h2>
        <Link to="/matches" className="text-sm text-primary-500 hover:text-primary-400 transition-colors">
          Ver todos →
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-gray-400">No hay partidos próximos disponibles</p>
          <p className="text-gray-600 text-sm mt-1">Los resultados se sincronizan automáticamente cada 5 minutos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {matches.map(match => (
            <MatchCard
              key={match._id}
              match={match}
              prediction={predictions[match._id]}
              onPredict={onPredict}
            />
          ))}
        </div>
      )}

      {matches.length > 0 && (
        <div className="text-center mt-4">
          <Link to="/matches" className="btn-secondary text-sm px-6 py-2 inline-block">
            Ver todos los partidos →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  // Auto-refresh cada 60s si hay partidos en vivo
  useEffect(() => {
    const interval = setInterval(() => {
      const hasLive = upcomingMatches.some(m => m.status === 'live');
      if (hasLive) loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, [upcomingMatches]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchRes, predRes, lbRes] = await Promise.all([
        getMatches({ upcoming: true }),
        getPredictions(),
        getLeaderboard()
      ]);

      setUpcomingMatches(matchRes.data.slice(0, 5));

      const predMap = {};
      predRes.data.forEach(p => { if (p.matchId) predMap[p.matchId._id] = p; });
      setPredictions(predMap);

      setLeaderboard(lbRes.data.slice(0, 10));
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Header: logo + bienvenida */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-8">
        <img src="/logo.png" alt="Prode 2026" className="h-24 w-auto object-contain" />
        <div>
          <h1 className="text-2xl font-bold text-white text-center sm:text-left">
            Hola, <span className="text-primary-400">{user?.name}</span>
          </h1>
          <p className="text-gray-400 text-sm text-center sm:text-left">Bienvenido al Prode del Mundial 2026</p>
        </div>
      </div>

      {/* Sistema de puntos — full width */}
      <ScoringSystem />

      {/* Ranking top 10 */}
      <RankingSection leaderboard={leaderboard} userId={user?.id} />

      {/* Próximos 5 partidos */}
      <UpcomingSection
        matches={upcomingMatches}
        predictions={predictions}
        onPredict={setSelectedMatch}
        loading={loading}
      />

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
