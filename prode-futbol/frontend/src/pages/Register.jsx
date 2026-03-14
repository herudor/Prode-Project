import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', invitationCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres');
    }
    setLoading(true);
    try {
      const res = await registerApi(form.name, form.email, form.password, form.invitationCode);
      login(res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-white">Prode <span className="text-yellow-400">2026</span></h1>
          <p className="text-gray-400 mt-2">Creá tu cuenta</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-6">Registro</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Código de invitación</label>
              <input
                type="text"
                name="invitationCode"
                value={form.invitationCode}
                onChange={handleChange}
                placeholder="XXXXXXXX"
                className="input-field uppercase"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-4">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-400">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
