import api, { setToken, clearToken, getToken } from './client';
import type { LoginCredentials, LoginResponse } from '../types';

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login/api', credentials);
  // Store the token for subsequent requests
  console.log('[Auth Debug] Login successful, storing token');
  setToken(response.data.access_token);
  console.log('[Auth Debug] Token stored, getToken() returns:', !!getToken());
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/api');
  // Clear the stored token
  clearToken();
}
