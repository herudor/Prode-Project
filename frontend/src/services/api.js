import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Interceptor: adjuntar token JWT desde localStorage en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (name, email, password, sector) =>
  api.post('/auth/register', { name, email, password, sector });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// Matches
export const getMatches = (params = {}) => api.get('/matches', { params });
export const getMatch = (id) => api.get(`/matches/${id}`);

// Predictions
export const getPredictions = () => api.get('/predictions');
export const savePrediction = (matchId, homeScore, awayScore, penaltyWinner = null) =>
  api.post(`/predictions/${matchId}`, { homeScore, awayScore, penaltyWinner });
export const getTournamentPrediction = () => api.get('/predictions/tournament/me');
export const saveTournamentPrediction = (champion, topScorer) =>
  api.post('/predictions/tournament/save', { champion, topScorer });

// Leaderboard
export const getLeaderboard = () => api.get('/leaderboard');

// Group standings & predictions
export const getGroupStandings = () => api.get('/groups/standings');
export const getGroupsInfo = () => api.get('/matches/groups-info');
export const getGroupPredictions = () => api.get('/group-predictions');
export const saveGroupPrediction = (group, first, second) =>
  api.post(`/group-predictions/${group}`, { first, second });

// Admin
export const generateInvitationCodes = (count = 1) =>
  api.post('/admin/invitation-codes', { count });
export const getInvitationCodes = () => api.get('/admin/invitation-codes');
export const syncMatches = () => api.post('/admin/sync');
export const updateMatch = (id, data) => api.put(`/admin/matches/${id}`, data);
export const getAdminMatches = () => api.get('/admin/matches');
export const createMatch = (data) => api.post('/admin/matches', data);
export const getUsers = () => api.get('/admin/users');
export const toggleUser = (id) => api.patch(`/admin/users/${id}/toggle`);
export const editUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const resetUserPassword = (id, newPassword) => api.post(`/admin/users/${id}/reset-password`, { newPassword });

// Profile
export const getProfile = () => api.get('/profile');
export const updateProfile = (name, sector) => api.put('/profile', { name, sector });
export const changePassword = (currentPassword, newPassword) => api.put('/profile/password', { currentPassword, newPassword });
export const setTournamentResult = (champion, topScorer) =>
  api.put('/admin/tournament-result', { champion, topScorer });
export const getPredictionsSummary = () => api.get('/admin/predictions-summary');
export const recalculateMatch = (id) => api.post(`/admin/recalculate/${id}`);

export default api;
