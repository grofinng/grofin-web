import { api } from './client';
import { StaffUser, UserRole } from '../types';

export interface NotifyRecipient {
  email: string;
  firstName: string;
  surname: string;
}

export const usersApi = {
  list: () => api.get<{ users: StaffUser[] }>('/users').then((r) => r.data.users),
  create: (data: {
    firstName: string;
    surname: string;
    email: string;
    password: string;
    role: Exclude<UserRole, 'user'>;
    receiveApplicationEmails?: boolean;
  }) => api.post<{ user: StaffUser }>('/users', data).then((r) => r.data.user),
  update: (id: string, data: { receiveApplicationEmails?: boolean }) =>
    api.patch<{ user: StaffUser }>(`/users/${id}`, data).then((r) => r.data.user),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/users/${id}`).then((r) => r.data),
  notifyRecipients: () =>
    api
      .get<{ recipients: NotifyRecipient[] }>('/users/notify-recipients')
      .then((r) => r.data.recipients),
};
