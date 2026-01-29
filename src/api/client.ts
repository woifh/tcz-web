import axios from 'axios';

const TOKEN_KEY = 'tcz_auth_token';

// Token management functions
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // Still needed for CORS
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization header
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 if:
    // 1. We're already on the login page
    // 2. The request is to /api/members/me (auth check)
    // 3. The request is to /api/auth/* endpoints
    const isAuthCheck = error.config?.url?.includes('/api/members/me');
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/');
    const isOnLoginPage = window.location.pathname === '/login';

    if (error.response?.status === 401 && !isAuthCheck && !isAuthEndpoint && !isOnLoginPage) {
      // Session expired during use - clear token and redirect to login
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
