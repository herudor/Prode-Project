import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/matches', label: 'Partidos' },
    { path: '/leaderboard', label: 'Ranking' },
    { path: '/tournament', label: 'Torneo' },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin' }] : [])
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="font-bold text-lg text-white">Prode <span className="text-yellow-400">2026</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User info */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-gray-400">Hola, <span className="text-white font-medium">{user?.name}</span></span>
            <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
              Salir
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-400 hover:text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-800">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(link.path) ? 'text-primary-500' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 px-4 pt-3 border-t border-gray-800 flex items-center justify-between">
              <span className="text-sm text-gray-400">{user?.name}</span>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1 px-3">Salir</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
