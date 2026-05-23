import { api } from './client';
import { ImpactStat, StatIcon } from '../types';

export const impactStatsApi = {
  // Public — active only
  list: () => api.get<{ stats: ImpactStat[] }>('/impact-stats').then((r) => r.data.stats),
  // Admin — all
  listAll: () => api.get<{ stats: ImpactStat[] }>('/impact-stats/all').then((r) => r.data.stats),
  create: (data: {
    key: string;
    label: string;
    value: string;
    icon?: StatIcon;
    order?: number;
    active?: boolean;
  }) => api.post<{ stat: ImpactStat }>('/impact-stats', data).then((r) => r.data.stat),
  update: (id: string, patch: Partial<Omit<ImpactStat, '_id' | 'key' | 'createdAt' | 'updatedAt'>>) =>
    api.patch<{ stat: ImpactStat }>(`/impact-stats/${id}`, patch).then((r) => r.data.stat),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/impact-stats/${id}`).then((r) => r.data),
};
