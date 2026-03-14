import React, { useState, useEffect } from 'react';
import {
  getInvitationCodes, generateInvitationCodes,
  syncMatches, getAdminMatches, updateMatch, createMatch,
  getUsers, setTournamentResult
} from '../services/api';

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// --- Pestaña: Códigos de invitación ---
function CodesTab() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(1);
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await getInvitationCodes(); setCodes(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateInvitationCodes(count);
      await load();
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <input
            type="number" min="1" max="50" value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="input-field w-20 text-center"
          />
          <button onClick={handleGenerate} disabled={generating} className="btn-primary">
            {generating ? 'Generando...' : `Generar ${count} código${count > 1 ? 's' : ''}`}
          </button>
        </div>
        <span className="text-sm text-gray-500">
          {codes.filter(c => !c.used).length} disponibles / {codes.length} total
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="pb-2">Código</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Usado por</th>
                <th className="pb-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {codes.map(code => (
                <tr key={code._id}>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-yellow-400">{code.code}</span>
                      {!code.used && (
                        <button
                          onClick={() => copyCode(code.code)}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          {copied === code.code ? '✓' : 'copiar'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      code.used ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {code.used ? 'Usado' : 'Disponible'}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">
                    {code.usedBy?.name || '-'}
                  </td>
                  <td className="py-2 text-gray-500 text-xs">
                    {new Date(code.createdAt).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Pestaña: Partidos ---
function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ homeScore: '', awayScore: '', status: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    homeTeam: '', awayTeam: '', date: '', phase: 'group', group: '', status: 'upcoming'
  });
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try { const res = await getAdminMatches(); setMatches(res.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      await syncMatches();
      await load();
      setMessage('Sincronización completada');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('Error en sincronización');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditSave = async () => {
    try {
      const data = {};
      if (editForm.homeScore !== '') data.homeScore = parseInt(editForm.homeScore);
      if (editForm.awayScore !== '') data.awayScore = parseInt(editForm.awayScore);
      if (editForm.status) data.status = editForm.status;
      await updateMatch(editing._id, data);
      await load();
      setEditing(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    try {
      await createMatch({ ...createForm, date: new Date(createForm.date) });
      await load();
      setShowCreate(false);
      setCreateForm({ homeTeam: '', awayTeam: '', date: '', phase: 'group', group: '', status: 'upcoming' });
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (match) => {
    setEditing(match);
    setEditForm({
      homeScore: match.homeScore ?? '',
      awayScore: match.awayScore ?? '',
      status: match.status
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleSync} disabled={syncing} className="btn-primary">
          {syncing ? 'Sincronizando...' : 'Sincronizar con TheSportsDB'}
        </button>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-secondary">
          + Crear partido manual
        </button>
        {message && <span className="text-sm text-green-400">{message}</span>}
      </div>

      {/* Create match form */}
      {showCreate && (
        <div className="card mb-6 border-blue-500/20">
          <h3 className="font-semibold mb-4">Nuevo partido</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Equipo local"
              value={createForm.homeTeam}
              onChange={e => setCreateForm(p => ({ ...p, homeTeam: e.target.value }))}
              className="input-field"
            />
            <input
              placeholder="Equipo visitante"
              value={createForm.awayTeam}
              onChange={e => setCreateForm(p => ({ ...p, awayTeam: e.target.value }))}
              className="input-field"
            />
            <input
              type="datetime-local"
              value={createForm.date}
              onChange={e => setCreateForm(p => ({ ...p, date: e.target.value }))}
              className="input-field"
            />
            <select
              value={createForm.phase}
              onChange={e => setCreateForm(p => ({ ...p, phase: e.target.value }))}
              className="input-field"
            >
              {['group','round_of_16','quarter','semi','third','final'].map(ph => (
                <option key={ph} value={ph}>{ph}</option>
              ))}
            </select>
            <input
              placeholder="Grupo (ej: Grupo A)"
              value={createForm.group}
              onChange={e => setCreateForm(p => ({ ...p, group: e.target.value }))}
              className="input-field"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleCreate} className="btn-primary">Crear</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="pb-2">Partido</th>
                <th className="pb-2">Fase</th>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Resultado</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {matches.map(match => (
                <tr key={match._id}>
                  <td className="py-2 pr-4">
                    <span className="text-white">{match.homeTeam}</span>
                    <span className="text-gray-500 mx-2">vs</span>
                    <span className="text-white">{match.awayTeam}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">{match.phase}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs">
                    {new Date(match.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      match.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400' :
                      match.status === 'live' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{match.status}</span>
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    {match.homeScore !== null ? `${match.homeScore}-${match.awayScore}` : '-'}
                  </td>
                  <td className="py-2">
                    <button onClick={() => startEdit(match)} className="text-xs text-primary-500 hover:text-primary-400">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold mb-4">
              {editing.homeTeam} vs {editing.awayTeam}
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Goles local</label>
                  <input
                    type="number" min="0"
                    value={editForm.homeScore}
                    onChange={e => setEditForm(p => ({ ...p, homeScore: e.target.value }))}
                    className="input-field text-center"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Goles visitante</label>
                  <input
                    type="number" min="0"
                    value={editForm.awayScore}
                    onChange={e => setEditForm(p => ({ ...p, awayScore: e.target.value }))}
                    className="input-field text-center"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Estado</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="input-field"
                >
                  <option value="upcoming">upcoming</option>
                  <option value="live">live</option>
                  <option value="finished">finished</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleEditSave} className="btn-primary flex-1">Guardar</button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Pestaña: Usuarios ---
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{users.length} usuario(s) registrado(s)</p>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="pb-2">Nombre</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Rol</th>
                <th className="pb-2">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u._id}>
                  <td className="py-2 pr-4 font-medium">{u.name}</td>
                  <td className="py-2 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>{u.role}</span>
                  </td>
                  <td className="py-2 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Pestaña: Resultados del torneo ---
function TournamentTab() {
  const [form, setForm] = useState({ champion: '', topScorer: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (!form.champion && !form.topScorer) return setError('Ingresá al menos campeón o goleador');
    setLoading(true);
    try {
      const res = await setTournamentResult(form.champion || undefined, form.topScorer || undefined);
      setMessage(`Actualizado: ${res.data.predictionsUpdated} predicciones recalculadas`);
    } catch (e) {
      setError(e.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <p className="text-gray-400 text-sm mb-6">
        Define el resultado final del torneo. Esto calculará los puntos de todas las predicciones de torneo.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Campeón</label>
          <input
            type="text"
            value={form.champion}
            onChange={e => setForm(p => ({ ...p, champion: e.target.value }))}
            placeholder="Nombre del equipo campeón"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Goleador</label>
          <input
            type="text"
            value={form.topScorer}
            onChange={e => setForm(p => ({ ...p, topScorer: e.target.value }))}
            placeholder="Nombre del goleador"
            className="input-field"
          />
        </div>
        {message && <p className="text-green-400 text-sm">{message}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Procesando...' : 'Definir resultado y calcular puntos'}
        </button>
      </form>
    </div>
  );
}

// --- Componente principal Admin ---
export default function Admin() {
  const [activeTab, setActiveTab] = useState('codes');

  const tabs = [
    { id: 'codes', label: '🎫 Invitaciones' },
    { id: 'matches', label: '⚽ Partidos' },
    { id: 'users', label: '👥 Usuarios' },
    { id: 'tournament', label: '🏆 Torneo' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">⚙️</span>
        <h1 className="text-2xl font-bold">Panel de Administración</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </TabButton>
        ))}
      </div>

      <div className="card">
        {activeTab === 'codes' && <CodesTab />}
        {activeTab === 'matches' && <MatchesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'tournament' && <TournamentTab />}
      </div>
    </div>
  );
}
