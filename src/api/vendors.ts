import { api } from './client';
import { Vendor, VendorCategory } from '../types';

export const vendorsApi = {
  list: (params?: { category?: VendorCategory; includeInactive?: boolean }) =>
    api
      .get<{ vendors: Vendor[] }>('/vendors', {
        params: {
          category: params?.category,
          includeInactive: params?.includeInactive ? 1 : undefined,
        },
      })
      .then((r) => r.data.vendors),
  create: (data: {
    businessName: string;
    address: string;
    area: string;
    category: VendorCategory;
    ownerName: string;
    ownerPhone: string;
    contactPhone?: string;
    partnerCode?: string;
  }) => api.post<{ vendor: Vendor }>('/vendors', data).then((r) => r.data.vendor),
  update: (id: string, data: Partial<Vendor>) =>
    api.patch<{ vendor: Vendor }>(`/vendors/${id}`, data).then((r) => r.data.vendor),
  remove: (id: string) =>
    api.delete<{ ok: boolean }>(`/vendors/${id}`).then((r) => r.data),
};
