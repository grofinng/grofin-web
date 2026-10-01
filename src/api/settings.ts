import { api } from './client';
import { RepaymentAccount } from '../types';

export const settingsApi = {
  repaymentAccount: () =>
    api.get<{ account: RepaymentAccount }>('/settings/repayment-account').then((r) => r.data.account),
  saveRepaymentAccount: (data: { bank: string; accountNumber: string; accountName: string }) =>
    api.put<{ account: RepaymentAccount }>('/settings/repayment-account', data).then((r) => r.data.account),
};
