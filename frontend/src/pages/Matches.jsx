import React, { useState, useEffect } from 'react';
import { getMatches, getPredictions } from '../services/api';
import MatchCard from '../components/MatchCard';
import PredictionForm from '../components/PredictionForm';

const PHASES = [
  { value: 'all', label: 'Todos' },
  { value: 'group', label: 'Grupos' },
  { value: 'round_of_16', label: 'Octavos' },
  { value: 'quarter', label: 'Cuartos' },
  { value: 'semi', label: 'Semis' },
  { value: 'third', label: '3er Puesto' },
  { value: 'final', label: 'Final' }
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'upcoming', label: 'Próximos' },
  { value: 'live', label: 'En vivo' },
  { value: 'finished', label: 'Finalizados' }
];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchRes, predRes] = await Promise.all([
        getMatches(),
        getPredictions()
      ]);
      setMatches(matchRes.data);

      const predMap = {};
      predRes.data.forEach(p => {
        if (p.matchId) predMap[p.matchId._id] = p;
      });
      setPredictions(predMap);
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

  const filteredMatches = matches.filter(m => {
    if (phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Partidos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1">
          {PHASES.map(p => (
            <button
              key={p.value}
              onClick={() => setPhaseFilter(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                phaseFilter === p.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-6">
        {STATUS_FILTERS.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-gray-600 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏟️</p>
          <p className="text-gray-400">No hay partidos con ese filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map(match => (
            <MatchCard
              key={match._id}
              match={match}
              prediction={predictions[match._id]}
              onPredict={setSelectedMatch}
            />
          ))}
        </div>
      )}

      {/* Prediction count */}
      <p className="text-center text-gray-600 text-sm mt-6">
        {filteredMatches.length} partido{filteredMatches.length !== 1 ? 's' : ''}
      </p>

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
