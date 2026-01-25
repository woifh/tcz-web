import api from './client';
import type { Member, LoginCredentials, LoginResponse } from '../types';

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login/api', credentials);
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/api');
}

export async function getCurrentUser(): Promise<Member> {
  const response = await api.get<{ member: Member }>('/api/members/me');
  return response.data.member;
}
