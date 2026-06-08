import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ProfileForm() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ name: '', sector: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getProfile()
      .then(res => setForm({ name: res.data.name, sector: res.data.sector || '' }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (!form.name.trim()) return setError('El nombre no puede estar vacío');
    setSaving(true);
    try {
      const res = await updateProfile(form.name, form.sector);
      login({ ...user, name: res.data.name });
      setMessage('Datos actualizados correctamente');
    } catch (err) {
      setError(err.response?.data?.message || 'Error actualizando');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-bold text-lg mb-2">Mis datos</h2>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Nombre y Apellido</label>
        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          className="input-field" required />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Sector</label>
        <input type="text" value={form.sector} onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
          placeholder="Ej: Producción, Calidad, RRHH..." className="input-field" />
      </div>
      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error   && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full py-2">
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (form.newPassword.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres');
    if (form.newPassword !== form.confirm) return setError('Las contraseñas no coinciden');
    setSaving(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setMessage('Contraseña cambiada correctamente');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Error cambiando contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-bold text-lg mb-2">Cambiar contraseña</h2>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Contraseña actual</label>
        <input type="password" value={form.currentPassword}
          onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
          className="input-field" required />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Nueva contraseña</label>
        <input type="password" value={form.newPassword}
          onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
          placeholder="Mínimo 6 caracteres" className="input-field" required />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Confirmar nueva contraseña</label>
        <input type="password" value={form.confirm}
          onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
          className="input-field" required />
      </div>
      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error   && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full py-2">
        {saving ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

export default function Profile() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">👤</span>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
      </div>
      <div className="space-y-6">
        <ProfileForm />
        <PasswordForm />
      </div>
    </div>
  );
}
