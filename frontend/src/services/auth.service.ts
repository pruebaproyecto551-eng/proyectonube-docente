import { api } from './api';
import type { AuthResponse, User } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async me(): Promise<{ user: User }> {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data;
  },

  async logout(refreshToken: string | null): Promise<void> {
    await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
  },

  async changePassword(newPassword: string): Promise<{ message: string; user: User }> {
    const { data } = await api.post<{ message: string; user: User }>('/auth/change-password', { newPassword });
    return data;
  },
};
