import axios from 'axios';

const DEFAULT_API_URL = 'https://app.notexa.cloud/api';

const normalizeApiUrl = (value?: string) => {
  const base = (value || DEFAULT_API_URL).trim().replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
  withCredentials: false,
  timeout: 30000,
});

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
  reader.readAsDataURL(file);
});

// Attach token to every request
api.interceptors.request.use((c) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('notexa_token');
    if (t) c.headers.Authorization = `Bearer ${t}`;
    if (c.data instanceof FormData) {
      const headers = c.headers as any;
      if (typeof headers.delete === 'function') headers.delete('Content-Type');
      delete headers['Content-Type'];
      delete headers['content-type'];
    }
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
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
  updateProfile: (d: any) => api.put('/profile', d),
  changePassword: (d: any) => api.put('/change-password', d),
  forgotPassword: (email: string) => api.post('/forgot-password', { email }),
  resetPassword: (d: { email: string; code: string; password: string; password_confirmation: string }) => api.post('/reset-password', d),
  resendVerification: (email: string) => api.post('/email/verification-notification', { email }),
  verifyEmailCode: (d: { email: string; code: string }) => api.post('/email/verify-code', d),
};

export const notesApi = {
  list: (p?: any) => api.get('/notes', { params: p }),
  create: (d: any) => api.post('/notes', d),
  get: (id: number, p?: any) => api.get(`/notes/${id}`, { params: p }),
  update: (id: number, d: any) => api.put(`/notes/${id}`, d),
  delete: (id: number) => api.delete(`/notes/${id}`),
  restore: (id: number) => api.post(`/notes/${id}/restore`),
  permanentDelete: (id: number) => api.delete(`/notes/${id}/permanent`),
  togglePin: (id: number) => api.patch(`/notes/${id}/pin`),
  trashed: () => api.get('/notes/trashed'),
  versions: (id: number) => api.get(`/notes/${id}/versions`),
  getShareCode: (id: number) => api.get(`/notes/${id}/share-code`),
  regenerateCode: (id: number) => api.post(`/notes/${id}/regenerate-code`),
  redeemCode: (code: string) => api.post('/notes/redeem-code', { code }),
  aiSummary: (id: number) => api.post(`/notes/${id}/ai-summary`),
  aiQuery: (id: number, data: { systemPrompt: string; userPrompt: string }) => api.post(`/notes/${id}/ai-query`, data),
  presence: (noteId: number, p?: any) => api.get(`/notes/${noteId}/presence`, { params: p }),
  heartbeat: (noteId: number, d: any) => api.post(`/notes/${noteId}/presence`, d),
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
  upload: async (file: File, noteId?: number) => {
    const fd = new FormData(); fd.append('file', file);
    if (noteId) fd.append('note_id', String(noteId));
    try {
      return await api.post('/files/upload', fd);
    } catch (error: any) {
      const responseText = JSON.stringify(error.response?.data || {});
      const uploadTempFailed = error.response?.status === 422
        && /failed to upload|required|valid file/i.test(responseText);

      if (!uploadTempFailed) throw error;

      const payload: any = {
        file_base64: await fileToDataUrl(file),
        original_name: file.name || 'upload.bin',
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
      };
      if (noteId) payload.note_id = noteId;

      return api.post('/files/upload', payload);
    }
  },
  download: (id: number) => api.get(`/files/${id}/download`),
  preview: (id: number) => api.get(`/files/${id}/preview`),
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
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/admin/settings/logo', fd);
  },
  testSmtp: (email: string) => api.post('/admin/settings/smtp/test', { email }),
  sharedNotes: (p?: any) => api.get('/admin/shared-notes', { params: p }),
  friendships: (p?: any) => api.get('/admin/friendships', { params: p }),
  activityLogs: (p?: any) => api.get('/admin/activity-logs', { params: p }),
};

export const publicApi = { settings: () => api.get('/settings/public') };
export default api;
