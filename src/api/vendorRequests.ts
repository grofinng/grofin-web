import { api } from './client';
import { VendorRequest, VendorRequestStatus } from '../types';

export const vendorRequestsApi = {
  submit: (formData: FormData) =>
    api
      .post<{ request: VendorRequest }>('/vendor-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.request),
  list: (status?: VendorRequestStatus) =>
    api
      .get<{ requests: VendorRequest[] }>('/vendor-requests', {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data.requests),
  approve: (id: string, adminNote?: string) =>
    api
      .patch<{ request: VendorRequest }>(`/vendor-requests/${id}/approve`, { adminNote })
      .then((r) => r.data.request),
  reject: (id: string, adminNote: string) =>
    api
      .patch<{ request: VendorRequest }>(`/vendor-requests/${id}/reject`, { adminNote })
      .then((r) => r.data.request),
};
