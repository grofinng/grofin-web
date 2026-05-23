import { api } from './client';
import { VendorCategory, VendorRequest, VendorRequestStatus } from '../types';

export interface VendorRequestSubmission {
  businessName: string;
  address: string;
  area: string;
  category: VendorCategory;
  contactPhone?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  notes?: string;
}

export const vendorRequestsApi = {
  submit: (data: VendorRequestSubmission) =>
    api.post<{ request: VendorRequest }>('/vendor-requests', data).then((r) => r.data.request),
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
