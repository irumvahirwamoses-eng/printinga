import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  // Do NOT set a global Content-Type: axios must be able to set the
  // multipart boundary itself when a FormData body is sent.
});

let isRefreshing = false;
let queue: { resolve: (v?: unknown) => void; reject: (e: unknown) => void }[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login') && !original.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(original));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        queue.forEach((p) => p.resolve());
        queue = [];
        return api(original);
      } catch (e) {
        queue.forEach((p) => p.reject(e));
        queue = [];
        // Notify AuthProvider so guards redirect instead of rendering a dead session.
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
