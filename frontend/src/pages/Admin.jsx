import React, { useState, useEffect } from 'react';
import {
  syncMatches, getAdminMatches, updateMatch, createMatch,
  getUsers, toggleUser, editUser, resetUserPassword, setTournamentResult,
  getPredictionsSummary, recalculateMatch,
  getAdminGroupResults, setGroupResult, getGroupPredictionsSummary, getGroupsInfo,
  getUserPoints
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

// --- Pestaña: Partidos ---
function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ homeScore: '', awayScore: '', status: '', penaltyWinner: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    homeTeam: '', awayTeam: '', date: '', phase: 'group', group: '', status: 'upcoming'
  });
  const [message, setMessage] = useState('');
  const [recalculating, setRecalculating] = useState(false);

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
      if (editForm.penaltyWinner !== undefined) data.penaltyWinner = editForm.penaltyWinner || null;
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

  const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third', 'final'];

  const startEdit = (match) => {
    setEditing(match);
    setEditForm({
      homeScore: match.homeScore ?? '',
      awayScore: match.awayScore ?? '',
      status: match.status,
      penaltyWinner: match.penaltyWinner || ''
    });
    setMessage('');
  };

  const handleRecalculate = async () => {
    if (!editing) return;
    setRecalculating(true);
    try {
      const res = await recalculateMatch(editing._id);
      setMessage(res.data.message || 'Puntos recalculados');
      await load();
      setEditing(null);
    } catch (e) {
      setMessage('Error recalculando puntos');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleSync} disabled={syncing} className="btn-primary">
          {syncing ? 'Sincronizando...' : '🔄 Sincronizar resultados'}
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
              {/* Penales: solo en eliminatorias con empate al 90' */}
              {KNOCKOUT_PHASES.includes(editing.phase) &&
               editForm.homeScore !== '' && editForm.awayScore !== '' &&
               parseInt(editForm.homeScore) === parseInt(editForm.awayScore) && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ganador en penales</label>
                  <select
                    value={editForm.penaltyWinner}
                    onChange={e => setEditForm(p => ({ ...p, penaltyWinner: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">-- Sin definir --</option>
                    <option value="home">{editing.homeTeam}</option>
                    <option value="away">{editing.awayTeam}</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleEditSave} className="btn-primary flex-1">Guardar</button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
            {editing.status === 'finished' && editing.homeScore !== null && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="w-full text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 border border-yellow-600/30 rounded-lg py-2 transition-colors"
                >
                  {recalculating ? 'Recalculando...' : '⚡ Recalcular puntos de predicciones'}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">Forzar recálculo si el score fue corregido</p>
              </div>
            )}
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
  const [toggling, setToggling] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [newPass, setNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [editModal, setEditModal] = useState(null); // { id, name, sector, email }
  const [editForm, setEditFormU] = useState({ name: '', sector: '', email: '' });
  const [editMsg, setEditMsg] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = () => {
    getUsers()
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEditModal = (u) => {
    setEditModal(u);
    setEditFormU({ name: u.name, sector: u.sector || '', email: u.email });
    setEditMsg('');
  };

  const handleEditSaveUser = async () => {
    if (!editForm.name.trim()) return setEditMsg('El nombre es requerido');
    setEditSaving(true);
    try {
      const res = await editUser(editModal._id, editForm);
      setUsers(prev => prev.map(u => u._id === editModal._id ? { ...u, ...res.data } : u));
      setEditMsg('¡Guardado!');
      setTimeout(() => { setEditModal(null); setEditMsg(''); }, 1200);
    } catch (e) {
      setEditMsg(e.response?.data?.message || 'Error guardando');
    } finally {
      setEditSaving(false);
    }
  };

  const handleReset = async () => {
    if (!newPass || newPass.length < 6) return setResetMsg('Mínimo 6 caracteres');
    try {
      await resetUserPassword(resetModal.id, newPass);
      setResetMsg('¡Contraseña reseteada!');
      setTimeout(() => { setResetModal(null); setNewPass(''); setResetMsg(''); }, 1500);
    } catch (e) { setResetMsg('Error al resetear'); }
  };

  const handleToggle = async (id) => {
    setToggling(id);
    try {
      await toggleUser(id);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, active: !u.active } : u));
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  };

  const activeCount = users.filter(u => u.active !== false).length;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">{users.length} usuario(s) — {activeCount} activo(s)</p>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                <th className="pb-2">Nombre</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Sector</th>
                <th className="pb-2">Rol</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => {
                const isActive = u.active !== false;
                return (
                  <tr key={u._id} className={!isActive ? 'opacity-50' : ''}>
                    <td className="py-2 pr-3 font-medium text-sm">{u.name}</td>
                    <td className="py-2 pr-3 text-gray-400 text-xs">{u.email}</td>
                    <td className="py-2 pr-3 text-gray-400 text-xs">{u.sector || '-'}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>{u.role}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>{isActive ? 'Activo' : 'Desactivado'}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-xs px-2 py-1 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          Editar
                        </button>
                        {u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => { setResetModal({ id: u._id, name: u.name }); setNewPass(''); setResetMsg(''); }}
                              className="text-xs px-2 py-1 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              Reset pass
                            </button>
                            <button
                              onClick={() => handleToggle(u._id)}
                              disabled={toggling === u._id}
                              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                isActive
                                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                  : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                              }`}
                            >
                              {toggling === u._id ? '...' : isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editar usuario */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full space-y-3">
            <h3 className="font-bold mb-1">Editar usuario</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre y Apellido</label>
              <input type="text" value={editForm.name}
                onChange={e => setEditFormU(p => ({ ...p, name: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sector</label>
              <input type="text" value={editForm.sector}
                onChange={e => setEditFormU(p => ({ ...p, sector: e.target.value }))}
                placeholder="Ej: Producción, Calidad..." className="input-field" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              <input type="email" value={editForm.email}
                onChange={e => setEditFormU(p => ({ ...p, email: e.target.value }))}
                className="input-field" />
            </div>
            {editMsg && <p className={`text-sm ${editMsg.includes('!') ? 'text-green-400' : 'text-red-400'}`}>{editMsg}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleEditSaveUser} disabled={editSaving} className="btn-primary flex-1">
                {editSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setEditModal(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full">
            <h3 className="font-bold mb-1">Reset contraseña</h3>
            <p className="text-sm text-gray-400 mb-4">{resetModal.name}</p>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              className="input-field mb-3"
            />
            {resetMsg && <p className={`text-sm mb-3 ${resetMsg.includes('!') ? 'text-green-400' : 'text-red-400'}`}>{resetMsg}</p>}
            <div className="flex gap-2">
              <button onClick={handleReset} className="btn-primary flex-1">Confirmar</button>
              <button onClick={() => setResetModal(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Pestaña: Predicciones ---
const POINTS_COLOR = { 3: 'text-green-400', 2: 'text-blue-400', 1: 'text-yellow-400', 0: 'text-red-400' };
const PHASE_LABEL = { group: 'Grupo', round_of_32: 'R32', round_of_16: 'Octavos', quarter: 'Cuartos', semi: 'Semis', third: '3er Puesto', final: 'Final' };

function MatchPredictionsSection() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    getPredictionsSummary()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!data.length) return <p className="text-gray-500 text-sm text-center py-8">No hay partidos finalizados todavía</p>;

  return (
    <div className="space-y-3">
      {data.map(({ match, predictions, totalPredictions, noPrediction }) => (
        <div key={match._id} className="border border-gray-800 rounded-xl overflow-hidden">
          {/* Header del partido */}
          <button
            onClick={() => setOpen(open === match._id ? null : match._id)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {PHASE_LABEL[match.phase] || match.phase} {match.group ? `· Grupo ${match.group}` : ''}
              </span>
              <span className="font-medium text-white text-sm">
                {match.homeTeam} <span className="text-yellow-400 font-bold">{match.homeScore}-{match.awayScore}</span> {match.awayTeam}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{totalPredictions} predicciones</span>
              <span className="text-gray-500 text-xs">{open === match._id ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* Tabla de predicciones */}
          {open === match._id && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="py-2 pl-4 pr-2 text-left">Usuario</th>
                    <th className="py-2 px-2 text-left text-gray-600">Sector</th>
                    <th className="py-2 px-2 text-center">Predicción</th>
                    <th className="py-2 pr-4 pl-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {predictions.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-800/30">
                      <td className="py-2 pl-4 pr-2 font-medium">{p.user.name}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{p.user.sector || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="font-mono">{p.homeScore}-{p.awayScore}</span>
                      </td>
                      <td className="py-2 pr-4 pl-2 text-center font-bold">
                        <span className={POINTS_COLOR[p.points] || 'text-gray-500'}>
                          {p.points ?? '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {noPrediction.length > 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 pl-4 text-xs text-gray-600">
                        Sin predicción: {noPrediction.join(', ')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GroupPredictionsSection() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    getGroupPredictionsSummary()
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!data.length) return <p className="text-gray-500 text-sm text-center py-8">No hay grupos cargados</p>;

  return (
    <div className="space-y-3">
      {data.map(({ group, result, predictions, noPrediction }) => (
        <div key={group} className="border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === group ? null : group)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Grupo {group}</span>
              {result
                ? <span className="text-sm text-white">1° <span className="text-green-400 font-medium">{result.first}</span> · 2° <span className="text-blue-400 font-medium">{result.second}</span></span>
                : <span className="text-xs text-yellow-500">Sin resultado definido</span>
              }
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{predictions.length} predicciones</span>
              <span className="text-gray-500 text-xs">{open === group ? '▲' : '▼'}</span>
            </div>
          </button>
          {open === group && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="py-2 pl-4 pr-2 text-left">Usuario</th>
                    <th className="py-2 px-2 text-left text-gray-600">Sector</th>
                    <th className="py-2 px-2 text-center">Predijo 1°</th>
                    <th className="py-2 px-2 text-center">Predijo 2°</th>
                    <th className="py-2 pr-4 pl-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {predictions.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-800/30">
                      <td className="py-2 pl-4 pr-2 font-medium">{p.user.name}</td>
                      <td className="py-2 px-2 text-gray-500 text-xs">{p.user.sector || '-'}</td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={result && p.first === result.first ? 'text-green-400 font-medium' : result && p.first === result.second ? 'text-yellow-400' : 'text-gray-400'}>{p.first}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={result && p.second === result.second ? 'text-green-400 font-medium' : result && p.second === result.first ? 'text-yellow-400' : 'text-gray-400'}>{p.second}</span>
                      </td>
                      <td className="py-2 pr-4 pl-2 text-center font-bold">
                        <span className={POINTS_COLOR[p.points] || 'text-gray-500'}>{p.points ?? '-'}</span>
                      </td>
                    </tr>
                  ))}
                  {noPrediction.length > 0 && (
                    <tr>
                      <td colSpan={5} className="py-2 pl-4 text-xs text-gray-600">
                        Sin predicción: {noPrediction.join(', ')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const PHASE_LABEL_SHORT = { group: 'Grupo', round_of_32: 'R32', round_of_16: 'Octavos', quarter: 'Cuartos', semi: 'Semis', third: '3er Puesto', final: 'Final' };

function UserPointsSection() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  useEffect(() => {
    getUsers().then(res => { setUsers(res.data); setUsersLoaded(true); }).catch(console.error);
  }, []);

  const filtered = search.trim().length >= 2
    ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.sector?.toLowerCase().includes(search.toLowerCase()))
    : [];

  const selectUser = async (user) => {
    setSelected(user);
    setSearch(user.name);
    setData(null);
    setLoading(true);
    try {
      const res = await getUserPoints(user._id);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const clear = () => { setSelected(null); setSearch(''); setData(null); };

  return (
    <div>
      {/* Buscador */}
      <div className="relative max-w-md mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuario (nombre o sector)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); setData(null); }}
            className="input-field pl-9 pr-8 text-sm"
          />
          {search && (
            <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* Dropdown de resultados */}
        {!selected && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
            {filtered.map(u => (
              <button key={u._id} onClick={() => selectUser(u)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors text-sm border-b border-gray-700/50 last:border-0">
                <span className="text-white">{u.name}</span>
                {u.sector && <span className="text-gray-500 text-xs ml-2">{u.sector}</span>}
              </button>
            ))}
          </div>
        )}
        {!selected && search.length >= 2 && filtered.length === 0 && usersLoaded && (
          <p className="text-xs text-gray-500 mt-2">Sin resultados para "{search}"</p>
        )}
        {search.length > 0 && search.length < 2 && (
          <p className="text-xs text-gray-500 mt-2">Escribí al menos 2 caracteres...</p>
        )}
      </div>

      {/* Loading */}
      {loading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>}

      {/* Desglose */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Header usuario */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div>
              <p className="font-bold text-lg text-white">{data.user.name}</p>
              {data.user.sector && <p className="text-sm text-gray-400">{data.user.sector}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary-400">{data.totals.total}</p>
              <p className="text-xs text-gray-500">puntos totales</p>
            </div>
          </div>

          {/* Sub-totales */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Partidos', pts: data.totals.matchPoints, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'Grupos', pts: data.totals.groupPoints, color: 'text-green-400', bg: 'bg-green-400/10' },
              { label: 'Torneo', pts: data.totals.tournamentPoints, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            ].map(({ label, pts, color, bg }) => (
              <div key={label} className={`${bg} rounded-lg p-3 text-center`}>
                <p className={`text-xl font-bold ${color}`}>{pts}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Tabla de partidos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Predicciones de partidos</h4>
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/30">
                    <th className="py-2 pl-3 pr-2 text-left">Partido</th>
                    <th className="py-2 px-2 text-center">Fase</th>
                    <th className="py-2 px-2 text-center">Resultado</th>
                    <th className="py-2 px-2 text-center">Predicción</th>
                    <th className="py-2 pr-3 pl-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {data.matchPredictions.map((item, i) => {
                    const match = item.match;
                    const p = item.prediction;
                    const hasResult = match.homeScore !== null && match.homeScore !== undefined;
                    return (
                      <tr key={i} className="hover:bg-gray-800/30">
                        <td className="py-2 pl-3 pr-2 text-xs">
                          <span className="text-white">{match.homeTeam}</span>
                          <span className="text-gray-600 mx-1">vs</span>
                          <span className="text-white">{match.awayTeam}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="text-xs text-gray-500">{PHASE_LABEL_SHORT[match.phase] || match.phase}{match.group ? ` ${match.group}` : ''}</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-xs">
                          {hasResult ? <span className="text-yellow-400 font-bold">{match.homeScore}-{match.awayScore}</span> : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-xs text-gray-300">
                          {p.homeScore}-{p.awayScore}
                        </td>
                        <td className="py-2 pr-3 pl-2 text-center font-bold">
                          <span className={POINTS_COLOR[p.points] || 'text-gray-500'}>{p.points ?? '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de grupos */}
          {data.groupPredictions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Predicciones de grupos</h4>
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/30">
                      <th className="py-2 pl-3 pr-2 text-left">Grupo</th>
                      <th className="py-2 px-2 text-center">Predijo 1°</th>
                      <th className="py-2 px-2 text-center">Predijo 2°</th>
                      <th className="py-2 pr-3 pl-2 text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {data.groupPredictions.map((gp, i) => (
                      <tr key={i} className="hover:bg-gray-800/30">
                        <td className="py-2 pl-3 pr-2 font-bold text-gray-300">Grupo {gp.group}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-300">{gp.first}</td>
                        <td className="py-2 px-2 text-center text-xs text-gray-300">{gp.second}</td>
                        <td className="py-2 pr-3 pl-2 text-center font-bold">
                          <span className={POINTS_COLOR[gp.points] || 'text-gray-500'}>{gp.points ?? '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Torneo */}
          {data.tournamentPrediction && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Predicción del torneo</h4>
              <div className="rounded-xl border border-gray-800 bg-gray-800/20 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Campeón predicho:</span>
                  <span className="text-white font-medium">{data.tournamentPrediction.champion || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pts campeón:</span>
                  <span className={POINTS_COLOR[data.tournamentPrediction.championPoints] || 'text-gray-500'}>
                    {data.tournamentPrediction.championPoints ?? '-'}
                  </span>
                </div>
                {data.tournamentPrediction.topScorer && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Goleador predicho:</span>
                      <span className="text-white font-medium">{data.tournamentPrediction.topScorer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pts goleador:</span>
                      <span className={POINTS_COLOR[data.tournamentPrediction.topScorerPoints] || 'text-gray-500'}>
                        {data.tournamentPrediction.topScorerPoints ?? '-'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PredictionsTab() {
  const [subTab, setSubTab] = useState('matches');
  const SUB_TABS = [
    { id: 'matches', label: '⚽ Partidos' },
    { id: 'groups',  label: '🏟️ Grupos' },
    { id: 'user',    label: '👤 Por usuario' },
  ];
  return (
    <div>
      <div className="flex gap-2 mb-5">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === t.id ? 'bg-primary-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'matches' && <MatchPredictionsSection />}
      {subTab === 'groups'  && <GroupPredictionsSection />}
      {subTab === 'user'    && <UserPointsSection />}
    </div>
  );
}

// --- Pestaña: Resultados de grupos ---
function GroupsTab() {
  const [groupsInfo, setGroupsInfo] = useState({});
  const [groupResults, setGroupResults] = useState({});
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState(null);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGroupsInfo(), getAdminGroupResults()])
      .then(([infoRes, resultsRes]) => {
        setGroupsInfo(infoRes.data || {});
        const rMap = {};
        (resultsRes.data || []).forEach(r => { rMap[r.group] = r; });
        setGroupResults(rMap);
        const fMap = {};
        Object.keys(infoRes.data || {}).forEach(g => {
          fMap[g] = { first: rMap[g]?.first || '', second: rMap[g]?.second || '' };
        });
        setForms(fMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (group) => {
    const { first, second } = forms[group] || {};
    if (!first || !second) return;
    if (first === second) return setMessages(p => ({ ...p, [group]: 'No podés elegir el mismo equipo' }));
    setSaving(group);
    try {
      const res = await setGroupResult(group, first, second);
      setGroupResults(p => ({ ...p, [group]: { group, first, second } }));
      setMessages(p => ({ ...p, [group]: `¡Guardado! ${res.data.predictionsUpdated} predicciones actualizadas` }));
      setTimeout(() => setMessages(p => ({ ...p, [group]: '' })), 4000);
    } catch (e) {
      setMessages(p => ({ ...p, [group]: e.response?.data?.message || 'Error' }));
    } finally {
      setSaving(null);
    }
  };

  const sortedGroups = Object.keys(groupsInfo).sort();

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  if (!sortedGroups.length) return <p className="text-gray-500 text-sm py-8">No hay grupos cargados todavía.</p>;

  return (
    <div>
      <p className="text-sm text-gray-400 mb-6">
        Definí quién terminó 1° y 2° en cada grupo. Esto calcula los puntos de las predicciones de grupo de todos los usuarios.
        Solo hacerlo cuando el grupo terminó sus 3 partidos.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedGroups.map(g => {
          const teams = groupsInfo[g]?.teams || [];
          const form = forms[g] || {};
          const saved = groupResults[g];
          return (
            <div key={g} className={`border rounded-xl p-4 ${saved ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Grupo {g}</h3>
                {saved && <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">Definido</span>}
              </div>
              {saved && (
                <p className="text-xs text-gray-400 mb-3">
                  Actual: <span className="text-white">1° {saved.first}</span> · <span className="text-white">2° {saved.second}</span>
                </p>
              )}
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">🥇 1° Clasificado</label>
                  <select
                    value={form.first || ''}
                    onChange={e => setForms(p => ({ ...p, [g]: { ...p[g], first: e.target.value } }))}
                    className="input-field text-sm py-1.5"
                  >
                    <option value="">-- Seleccioná --</option>
                    {teams.map(t => <option key={t.name} value={t.name} disabled={t.name === form.second}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">🥈 2° Clasificado</label>
                  <select
                    value={form.second || ''}
                    onChange={e => setForms(p => ({ ...p, [g]: { ...p[g], second: e.target.value } }))}
                    className="input-field text-sm py-1.5"
                  >
                    <option value="">-- Seleccioná --</option>
                    {teams.map(t => <option key={t.name} value={t.name} disabled={t.name === form.first}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              {messages[g] && (
                <p className={`text-xs mb-2 ${messages[g].includes('!') ? 'text-green-400' : 'text-red-400'}`}>{messages[g]}</p>
              )}
              <button
                onClick={() => handleSave(g)}
                disabled={saving === g || !form.first || !form.second}
                className="btn-primary w-full text-sm py-1.5"
              >
                {saving === g ? 'Guardando...' : saved ? 'Actualizar y recalcular' : 'Definir y calcular puntos'}
              </button>
            </div>
          );
        })}
      </div>
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
  const [activeTab, setActiveTab] = useState('matches');

  const tabs = [
    { id: 'matches', label: '⚽ Partidos' },
    { id: 'predictions', label: '🎯 Predicciones' },
    { id: 'users', label: '👥 Usuarios' },
    { id: 'groups', label: '🏟️ Grupos' },
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
        {activeTab === 'matches' && <MatchesTab />}
        {activeTab === 'predictions' && <PredictionsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'groups' && <GroupsTab />}
        {activeTab === 'tournament' && <TournamentTab />}
      </div>
    </div>
  );
}
