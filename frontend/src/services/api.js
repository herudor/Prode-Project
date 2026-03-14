import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true  // Enviar/recibir cookies HttpOnly automáticamente
});

// Interceptor: manejar 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (name, email, password, invitationCode) =>
  api.post('/auth/register', { name, email, password, invitationCode });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// Matches
export const getMatches = (params = {}) => api.get('/matches', { params });
export const getMatch = (id) => api.get(`/matches/${id}`);

// Predictions
export const getPredictions = () => api.get('/predictions');
export const savePrediction = (matchId, homeScore, awayScore) =>
  api.post(`/predictions/${matchId}`, { homeScore, awayScore });
export const getTournamentPrediction = () => api.get('/predictions/tournament/me');
export const saveTournamentPrediction = (champion, topScorer) =>
  api.post('/predictions/tournament/save', { champion, topScorer });

// Leaderboard
export const getLeaderboard = () => api.get('/leaderboard');

// Admin
export const generateInvitationCodes = (count = 1) =>
  api.post('/admin/invitation-codes', { count });
export const getInvitationCodes = () => api.get('/admin/invitation-codes');
export const syncMatches = () => api.post('/admin/sync');
export const updateMatch = (id, data) => api.put(`/admin/matches/${id}`, data);
export const getAdminMatches = () => api.get('/admin/matches');
export const createMatch = (data) => api.post('/admin/matches', data);
export const getUsers = () => api.get('/admin/users');
export const setTournamentResult = (champion, topScorer) =>
  api.put('/admin/tournament-result', { champion, topScorer });

export default api;
