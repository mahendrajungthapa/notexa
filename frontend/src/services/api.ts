import axios from 'axios';

const DEFAULT_API_URL = 'http://127.0.0.1:8000/api';

const normalizeApiUrl = (value?: string) => {
  const base = (value || DEFAULT_API_URL).trim().replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
const API_ORIGIN = API_URL.replace(/\/api$/, '');

export const resolveApiAssetUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
};

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: false,
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use((c) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('notexa_token');
    if (t) c.headers.Authorization = `Bearer ${t}`;
  }
  return c;
});

// Handle 401 - redirect to login (but NOT during login/register requests)
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401 && typeof window !== 'undefined') {
      const url = e.config?.url || '';
      // Don't redirect if we're already on login/register page
      if (!url.includes('/login') && !url.includes('/register')) {
        localStorage.removeItem('notexa_token');
        localStorage.removeItem('notexa_user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(e);
  }
);

export const authApi = {
  register: (d: any) => api.post('/register', d),
  login: (d: { login: string; password: string }) => api.post('/login', d),
  forgotPassword: (email: string) => api.post('/forgot-password', { email }),
  resetPassword: (d: { email: string; code: string; password: string; password_confirmation: string }) => api.post('/reset-password', d),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
  updateProfile: (d: any) => api.put('/profile', d),
  changePassword: (d: any) => api.put('/change-password', d),
  verifyEmailCode: (d: { email: string; code: string }) => api.post('/email/verify-code', d),
  resendVerification: (email: string) => api.post('/email/verification-notification', { email }),
};

export const notesApi = {
  list: (p?: any) => api.get('/notes', { params: p }),
  create: (d: any) => api.post('/notes', d),
  get: (id: number) => api.get(`/notes/${id}`),
  update: (id: number, d: any) => api.put(`/notes/${id}`, d),
  delete: (id: number) => api.delete(`/notes/${id}`),
  restore: (id: number) => api.post(`/notes/${id}/restore`),
  permanentDelete: (id: number) => api.delete(`/notes/${id}/permanent`),
  togglePin: (id: number) => api.patch(`/notes/${id}/pin`),
  toggleArchive: (id: number) => api.patch(`/notes/${id}/archive`),
  archived: () => api.get('/notes/archived'),
  trashed: () => api.get('/notes/trashed'),
  versions: (id: number) => api.get(`/notes/${id}/versions`),
  getShareCode: (id: number) => api.get(`/notes/${id}/share-code`),
  regenerateCode: (id: number) => api.post(`/notes/${id}/regenerate-code`),
  redeemCode: (code: string) => api.post('/notes/redeem-code', { code }),
  aiSummary: (id: number) => api.post(`/notes/${id}/ai-summary`),
  aiQuery: (id: number, data: { systemPrompt: string; userPrompt: string }) => api.post(`/notes/${id}/ai-query`, data),
  share: (noteId: number, d: any) => api.post(`/notes/${noteId}/share`, d),
  updatePermission: (noteId: number, userId: number, d: any) => api.put(`/notes/${noteId}/share/${userId}`, d),
  unshare: (noteId: number, userId: number) => api.delete(`/notes/${noteId}/share/${userId}`),
  collaborators: (noteId: number) => api.get(`/notes/${noteId}/collaborators`),
  sharedWithMe: (p?: any) => api.get('/shared-with-me', { params: p }),
};

export const friendsApi = {
  list: () => api.get('/friends'),
  pendingRequests: () => api.get('/friends/requests'),
  sendRequest: (username: string) => api.post('/friends/request', { username }),
  acceptRequest: (id: number) => api.put(`/friends/accept/${id}`),
  rejectRequest: (id: number) => api.put(`/friends/reject/${id}`),
  removeFriend: (userId: number) => api.delete(`/friends/${userId}`),
  searchUsers: (query: string) => api.get('/friends/search', { params: { query } }),
};

export const filesApi = {
  list: (p?: any) => api.get('/files', { params: p }),
  sharedWithMe: (p?: any) => api.get('/files/shared-with-me', { params: p }),
  upload: (file: File, noteId?: number) => {
    const fd = new FormData(); fd.append('file', file);
    if (noteId) fd.append('note_id', String(noteId));
    return api.post('/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  download: (id: number) => api.get(`/files/${id}/download`),
  preview: (id: number) => api.get(`/files/${id}/preview`),
  shares: (id: number) => api.get(`/files/${id}/shares`),
  share: (id: number, d: { user_id: number }) => api.post(`/files/${id}/share`, d),
  unshare: (id: number, userId: number) => api.delete(`/files/${id}/share/${userId}`),
  delete: (id: number) => api.delete(`/files/${id}`),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (p?: any) => api.get('/admin/users', { params: p }),
  userDetail: (id: number) => api.get(`/admin/users/${id}`),
  updateUser: (id: number, d: any) => api.put(`/admin/users/${id}`, d),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  notes: (p?: any) => api.get('/admin/notes', { params: p }),
  deleteNote: (id: number) => api.delete(`/admin/notes/${id}`),
  getSettings: (g?: string) => api.get('/admin/settings', { params: { group: g } }),
  updateSettings: (s: any[]) => api.put('/admin/settings', { settings: s }),
  testSmtp: (email: string) => api.post('/admin/settings/smtp/test', { email }),
  sharedNotes: (p?: any) => api.get('/admin/shared-notes', { params: p }),
  friendships: (p?: any) => api.get('/admin/friendships', { params: p }),
  activityLogs: (p?: any) => api.get('/admin/activity-logs', { params: p }),
};

export const publicApi = { settings: () => api.get('/settings/public') };
export default api;
