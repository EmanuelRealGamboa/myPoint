import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject access token from localStorage on every request
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('mqf_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear session and redirect to login
apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mqf_access');
      localStorage.removeItem('mqf_refresh');
      localStorage.removeItem('mqf_profile');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;
