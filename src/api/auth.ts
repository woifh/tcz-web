import api, { setToken, clearToken } from './client';
import type { LoginCredentials, LoginResponse } from '../types';

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login/api', credentials);
  // Store the token for subsequent requests
  setToken(response.data.access_token);
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/api');
  // Clear the stored token
  clearToken();
}
