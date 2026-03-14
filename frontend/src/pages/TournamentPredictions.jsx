import React, { useState, useEffect } from 'react';
import { getTournamentPrediction, saveTournamentPrediction } from '../services/api';

// Lista de selecciones clasificadas al Mundial 2026
const TEAMS = [
  'Argentina', 'Brasil', 'Francia', 'España', 'Alemania',
  'Inglaterra', 'Portugal', 'Países Bajos', 'Uruguay', 'Colombia',
  'México', 'Estados Unidos', 'Canadá', 'Marruecos', 'Senegal',
  'Nigeria', 'Japón', 'Corea del Sur', 'Australia', 'Arabia Saudita',
  'Irán', 'Polonia', 'Croacia', 'Bélgica', 'Dinamarca',
  'Suiza', 'Serbia', 'Ecuador', 'Perú', 'Chile',
  'Venezuela', 'Bolivia', 'Paraguay', 'Costa Rica', 'Panamá',
  'Honduras', 'El Salvador', 'Jamaica', 'Haití', 'Trinidad y Tobago',
  'Camerún', 'Ghana', 'Costa de Marfil', 'Mali', 'Egipto',
  'Túnez', 'Argelia', 'Sudáfrica', 'Angola', 'RD Congo',
  'China', 'Indonesia', 'Qatar', 'Irak', 'Uzbekistán',
  'Turquía', 'Austria', 'Hungría', 'Escocia', 'Grecia',
  'Ucrania', 'Rumania', 'Albania', 'Georgia', 'Eslovenia'
].sort();

export default function TournamentPredictions() {
  const [form, setForm] = useState({ champion: '', topScorer: '' });
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getTournamentPrediction()
      .then(res => {
        const data = res.data;
        setSaved(data);
        if (data.champion || data.topScorer) {
          setForm({ champion: data.champion || '', topScorer: data.topScorer || '' });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!form.champion) return setError('Seleccioná un campeón');

    setSaving(true);
    try {
      const res = await saveTournamentPrediction(form.champion, form.topScorer);
      setSaved(res.data);
      setMessage('¡Predicción guardada correctamente!');
    } catch (err) {
      setError(err.response?.data?.message || 'Error guardando predicción');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🏆</span>
        <h1 className="text-2xl font-bold">Predicciones del Torneo</h1>
      </div>
      <p className="text-gray-400 mb-8">Elegí el campeón y el goleador del Mundial 2026</p>

      {/* Points info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card border-yellow-500/20 bg-yellow-500/5 text-center">
          <p className="text-4xl font-bold text-yellow-400">5</p>
          <p className="text-sm text-gray-400 mt-1">pts por campeón</p>
        </div>
        <div className="card border-orange-500/20 bg-orange-500/5 text-center">
          <p className="text-4xl font-bold text-orange-400">3</p>
          <p className="text-sm text-gray-400 mt-1">pts por goleador</p>
        </div>
      </div>

      {/* Current saved prediction */}
      {saved && (saved.champion || saved.topScorer) && (
        <div className="card border-primary-500/30 mb-6">
          <h3 className="text-sm text-gray-500 mb-3">Tu predicción actual</h3>
          <div className="flex gap-6">
            {saved.champion && (
              <div>
                <p className="text-xs text-gray-500">Campeón</p>
                <p className="font-bold text-yellow-400 flex items-center gap-1">
                  🏆 {saved.champion}
                </p>
                {saved.championPoints > 0 && (
                  <p className="text-xs text-green-400 mt-1">+{saved.championPoints} pts</p>
                )}
              </div>
            )}
            {saved.topScorer && (
              <div>
                <p className="text-xs text-gray-500">Goleador</p>
                <p className="font-bold text-orange-400 flex items-center gap-1">
                  ⚽ {saved.topScorer}
                </p>
                {saved.topScorerPoints > 0 && (
                  <p className="text-xs text-green-400 mt-1">+{saved.topScorerPoints} pts</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Champion */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            🏆 Campeón del Mundial
          </label>
          <select
            value={form.champion}
            onChange={e => setForm(prev => ({ ...prev, champion: e.target.value }))}
            className="input-field"
          >
            <option value="">-- Seleccioná un equipo --</option>
            {TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Top scorer */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            ⚽ Goleador del torneo
            <span className="text-gray-500 font-normal ml-2">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.topScorer}
            onChange={e => setForm(prev => ({ ...prev, topScorer: e.target.value }))}
            placeholder="Nombre del jugador (ej: Lionel Messi)"
            className="input-field"
          />
          <p className="text-xs text-gray-600 mt-1">Escribí el nombre exacto del jugador</p>
        </div>

        {message && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-green-400 text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? 'Guardando...' : saved?.champion ? 'Actualizar predicción' : 'Guardar predicción'}
        </button>
      </form>

      <p className="text-center text-xs text-gray-600 mt-4">
        Podés actualizar tu predicción hasta que comience el torneo
      </p>
    </div>
  );
}
