import React, { useState, useEffect } from 'react';
import { getGroupsInfo, getGroupPredictions, saveGroupPrediction, getGroupStandings, getGroupResults } from '../services/api';
import { teamName } from '../utils/teamNames';
import FlagIcon from '../components/FlagIcon';

// ─────────────────────────────────────────────
// TAB: POSICIONES
// ─────────────────────────────────────────────

function StandingsRow({ pos, team }) {
  const qualifyClass =
    pos === 1 ? 'border-l-2 border-green-500' :
    pos === 2 ? 'border-l-2 border-green-500' :
    pos === 3 ? 'border-l-2 border-yellow-500' :
    'border-l-2 border-transparent';

  const rowBg =
    pos === 1 ? 'bg-green-500/5' :
    pos === 2 ? 'bg-green-500/5' :
    pos === 3 ? 'bg-yellow-500/5' :
    '';

  return (
    <tr className={`text-sm border-b border-gray-800 last:border-0 ${rowBg} ${qualifyClass}`}>
      <td className="py-2 pl-3 pr-2 text-center font-bold text-gray-400 w-8">{pos}</td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-2">
          <FlagIcon teamName={team.name} size={14} className="flex-shrink-0" />
          <span className="font-medium text-white truncate max-w-[120px]">{teamName(team.name)}</span>
        </div>
      </td>
      <td className="py-2 px-2 text-center text-gray-400">{team.mp}</td>
      <td className="py-2 px-2 text-center text-gray-400">{team.w}</td>
      <td className="py-2 px-2 text-center text-gray-400">{team.d}</td>
      <td className="py-2 px-2 text-center text-gray-400">{team.l}</td>
      <td className="py-2 px-2 text-center text-gray-400 hidden sm:table-cell">{team.gf}</td>
      <td className="py-2 px-2 text-center text-gray-400 hidden sm:table-cell">{team.ga}</td>
      <td className="py-2 px-2 text-center text-gray-400 hidden sm:table-cell">
        {team.gd > 0 ? `+${team.gd}` : team.gd}
      </td>
      <td className="py-2 pr-3 pl-2 text-center font-bold text-white">{team.pts}</td>
    </tr>
  );
}

function GroupTable({ group }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800/50">
        <h3 className="font-bold text-white">Grupo {group.name}</h3>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Clasifica</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>Posible 3°</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-800">
              <th className="py-2 pl-3 pr-2 text-center w-8">#</th>
              <th className="py-2 px-2 text-left">Equipo</th>
              <th className="py-2 px-2 text-center" title="Partidos jugados">PJ</th>
              <th className="py-2 px-2 text-center" title="Ganados">G</th>
              <th className="py-2 px-2 text-center" title="Empates">E</th>
              <th className="py-2 px-2 text-center" title="Perdidos">P</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell" title="Goles a favor">GF</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell" title="Goles en contra">GC</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell" title="Diferencia">DIF</th>
              <th className="py-2 pr-3 pl-2 text-center font-bold" title="Puntos">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, i) => (
              <StandingsRow key={team.name || i} pos={i + 1} team={team} />
            ))}
            {group.teams.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-gray-600 text-sm">Sin datos</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandingsTab() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getGroupStandings()
      .then(res => setStandings(res.data))
      .catch(() => setError('No se pudieron cargar las posiciones'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }
  if (error) return <p className="text-red-400 text-center py-8">{error}</p>;
  if (!standings.length) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">⏳</p>
        <p className="text-gray-400">Las posiciones se actualizarán cuando comiencen los partidos</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">
        Los <span className="text-green-400 font-medium">2 primeros</span> de cada grupo clasifican directamente.
        Los <span className="text-yellow-400 font-medium">8 mejores terceros</span> también clasifican a la Ronda de 32.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {standings.map(group => (
          <GroupTable key={group.name} group={group} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB: MIS PREDICCIONES
// ─────────────────────────────────────────────

function GroupCard({ group, info, prediction, result, onSaved }) {
  const [first, setFirst] = useState(prediction?.first || '');
  const [second, setSecond] = useState(prediction?.second || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const teams = info?.teams || [];
  const locked = info?.locked || false;

  const handleSave = async () => {
    if (!first || !second) return setError('Seleccioná ambos clasificados');
    if (first === second) return setError('No podés elegir el mismo equipo');
    setError('');
    setSaving(true);
    try {
      await saveGroupPrediction(group, first, second);
      setSuccess(true);
      onSaved(group, first, second);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const pointsLabel = {
    0: { text: '0 pts', cls: 'text-red-400' },
    1: { text: '1 pt', cls: 'text-yellow-400' },
    2: { text: '2 pts', cls: 'text-yellow-400' },
    3: { text: '3 pts', cls: 'text-blue-400' },
    4: { text: '4 pts', cls: 'text-blue-400' },
    5: { text: '5 pts — ¡Perfecto!', cls: 'text-green-400' },
  };
  const pts = prediction?.points;

  return (
    <div className={`card transition-all ${locked ? 'opacity-75' : 'hover:border-gray-600'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Grupo {group}</h3>
        {locked
          ? <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">🔒 Cerrado</span>
          : <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">Abierto</span>
        }
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {teams.map(t => (
          <div key={t.name} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2 py-1">
            <FlagIcon teamName={t.name} size={14} className="flex-shrink-0" />
            <span className="text-xs text-gray-300">{teamName(t.name)}</span>
          </div>
        ))}
      </div>

      {/* Resultado real del grupo */}
      {result && (
        <div className="bg-gray-800/50 rounded-lg p-3 mb-3 text-xs space-y-1">
          <p className="text-gray-400 font-medium mb-1">Resultado final del grupo:</p>
          <p><span className="text-yellow-400">🥇 1°</span> <span className="text-white font-medium">{teamName(result.first)}</span></p>
          <p><span className="text-gray-400">🥈 2°</span> <span className="text-white font-medium">{teamName(result.second)}</span></p>
        </div>
      )}

      {pts !== null && pts !== undefined && (
        <div className={`text-sm font-semibold mb-3 ${pointsLabel[pts]?.cls || 'text-gray-400'}`}>
          {pointsLabel[pts]?.text || `${pts} pts`}
        </div>
      )}

      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">🥇 1° Clasificado</label>
          <select value={first} onChange={e => setFirst(e.target.value)} disabled={locked} className="input-field text-sm py-1.5">
            <option value="">-- Seleccioná --</option>
            {teams.map(t => (
              <option key={t.name} value={t.name} disabled={t.name === second}>{teamName(t.name)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">🥈 2° Clasificado</label>
          <select value={second} onChange={e => setSecond(e.target.value)} disabled={locked} className="input-field text-sm py-1.5">
            <option value="">-- Seleccioná --</option>
            {teams.map(t => (
              <option key={t.name} value={t.name} disabled={t.name === first}>{teamName(t.name)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving || !first || !second}
          className="btn-primary w-full text-sm py-2 mt-3"
        >
          {saving ? 'Guardando...' : success ? '¡Guardado!' : prediction ? 'Actualizar' : 'Guardar'}
        </button>
      )}

      {locked && prediction && (
        <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
          Tu predicción: <span className="text-white">{teamName(prediction.first)}</span> y <span className="text-white">{teamName(prediction.second)}</span>
        </div>
      )}
    </div>
  );
}

function PredictionsTab() {
  const [groupsInfo, setGroupsInfo] = useState({});
  const [predictions, setPredictions] = useState({});
  const [groupResults, setGroupResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGroupsInfo(), getGroupPredictions(), getGroupResults()])
      .then(([infoRes, predRes, resultsRes]) => {
        setGroupsInfo(infoRes.data);
        const predMap = {};
        predRes.data.forEach(p => { predMap[p.group] = p; });
        setPredictions(predMap);
        const resMap = {};
        (resultsRes.data || []).forEach(r => { resMap[r.group] = r; });
        setGroupResults(resMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (group, first, second) => {
    setPredictions(prev => ({ ...prev, [group]: { ...prev[group], group, first, second } }));
  };

  const sortedGroups = Object.keys(groupsInfo).sort();
  const totalPredicted = Object.keys(predictions).length;
  const totalGroups = sortedGroups.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-sm">
          <span className="text-green-400 font-bold">5 pts</span>
          <span className="text-gray-400 ml-1">— Ambos en posición exacta</span>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm">
          <span className="text-blue-400 font-bold">3 pts</span>
          <span className="text-gray-400 ml-1">— 1° exacto + 2° swapped</span>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm">
          <span className="text-yellow-400 font-bold">1-2 pts</span>
          <span className="text-gray-400 ml-1">— Un equipo clasificado correcto</span>
        </div>
      </div>

      {totalGroups > 0 && (
        <p className="text-sm text-gray-500 mb-6">
          Predicciones completadas: <span className="text-white font-medium">{totalPredicted}/{totalGroups}</span>
        </p>
      )}

      {totalGroups === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⏳</p>
          <p className="text-gray-400">Los grupos se cargarán cuando estén disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedGroups.map(g => (
            <GroupCard key={g} group={g} info={groupsInfo[g]} prediction={predictions[g]} result={groupResults[g]} onSaved={handleSaved} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

const TABS = [
  { id: 'standings', label: 'Posiciones', icon: '📊' },
  { id: 'predictions', label: 'Mis predicciones', icon: '🎯' },
];

export default function GroupPredictions() {
  const [activeTab, setActiveTab] = useState('standings');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏟️</span>
        <div>
          <h1 className="text-2xl font-bold">Fase de Grupos</h1>
          <p className="text-gray-400 text-sm">12 grupos · 72 partidos · 48 selecciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'standings' ? <StandingsTab /> : <PredictionsTab />}
    </div>
  );
}
