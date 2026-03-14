import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Matches from './pages/Matches';
import Leaderboard from './pages/Leaderboard';
import TournamentPredictions from './pages/TournamentPredictions';
import Admin from './pages/Admin';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Home /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/matches" element={
            <ProtectedRoute>
              <Layout><Matches /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <Layout><Leaderboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/tournament" element={
            <ProtectedRoute>
              <Layout><TournamentPredictions /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <Layout><Admin /></Layout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
