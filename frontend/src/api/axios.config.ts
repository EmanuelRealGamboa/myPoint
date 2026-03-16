import axios from 'axios';
import { tokenStore } from '../utils/tokenStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token from memory ─────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccess();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: silent token refresh on 401 ────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenStore.getRefresh();

      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access, refresh } = response.data;

          tokenStore.setAccess(access);
          if (refresh) tokenStore.setRefresh(refresh);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed — clear this tab's session and send to login
          tokenStore.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } else {
        tokenStore.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
