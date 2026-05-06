import { api } from './client';
import { Application, ApplicationStatus } from '../types';

export const applicationsApi = {
  create: (formData: FormData) =>
    api
      .post<{ application: Application }>('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.application),
  update: (id: string, formData: FormData) =>
    api
      .patch<{ application: Application }>(`/applications/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.application),
  list: () =>
    api.get<{ applications: Application[] }>('/applications').then((r) => r.data.applications),
  get: (id: string) =>
    api.get<{ application: Application }>(`/applications/${id}`).then((r) => r.data.application),
  adminListAll: () =>
    api
      .get<{ applications: Application[] }>('/applications/admin/all')
      .then((r) => r.data.applications),
  adminUpdateStatus: (
    id: string,
    payload: { status: ApplicationStatus; statusNote?: string; allowEdit?: boolean }
  ) =>
    api
      .patch<{ application: Application }>(`/applications/admin/${id}/status`, payload)
      .then((r) => r.data.application),
};
