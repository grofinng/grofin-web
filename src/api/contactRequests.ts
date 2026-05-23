import { api } from './client';
import { ContactRequest, ContactRequestStatus } from '../types';

export interface ContactRequestSubmission {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export const contactRequestsApi = {
  submit: (data: ContactRequestSubmission) =>
    api.post<{ request: ContactRequest }>('/contact-requests', data).then((r) => r.data.request),
  list: () =>
    api.get<{ requests: ContactRequest[] }>('/contact-requests').then((r) => r.data.requests),
  update: (id: string, patch: { status?: ContactRequestStatus; adminNote?: string }) =>
    api.patch<{ request: ContactRequest }>(`/contact-requests/${id}`, patch).then((r) => r.data.request),
};
