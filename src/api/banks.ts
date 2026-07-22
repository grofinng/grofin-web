import { api } from './client';
import { Bank } from '../types';

export const banksApi = {
  list: () => api.get<{ banks: Bank[] }>('/banks').then((r) => r.data.banks),
  resolve: (accountNumber: string, bankCode: string) =>
    api
      .get<{ accountName: string }>('/banks/resolve', {
        params: { account_number: accountNumber, bank_code: bankCode },
      })
      .then((r) => r.data.accountName),
};
