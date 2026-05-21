import { api } from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  register: (data: { firstName: string; surname: string; email: string; password: string; nin: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  me: () => api.get<{ user: User }>('/auth/me').then((r) => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<{ ok: boolean }>('/auth/change-password', data).then((r) => r.data),
  updateProfile: (data: { firstName?: string; surname?: string; email?: string; nin?: string }) =>
    api.patch<{ user: User }>('/auth/profile', data).then((r) => r.data.user),
};
