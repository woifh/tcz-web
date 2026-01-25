import axios from 'axios';

// JWT is stored in httpOnly cookie - browser sends it automatically
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // Required to send/receive cookies cross-origin
  headers: {
    'Content-Type': 'application/json',
  },
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
      // Session expired during use - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
