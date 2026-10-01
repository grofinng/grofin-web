import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings';
import { RepaymentAccount } from '../types';

// Shared across every component on the page so opening ten review panels
// makes one request, and saving a new default updates all of them.
let cached: RepaymentAccount | null = null;
let inflight: Promise<RepaymentAccount> | null = null;
const listeners = new Set<(a: RepaymentAccount) => void>();

function load(): Promise<RepaymentAccount> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = settingsApi
      .repaymentAccount()
      .then((a) => {
        cached = a;
        listeners.forEach((l) => l(a));
        return a;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function saveRepaymentAccount(data: { bank: string; accountNumber: string; accountName: string }) {
  const saved = await settingsApi.saveRepaymentAccount(data);
  cached = saved;
  listeners.forEach((l) => l(saved));
  return saved;
}

export function useRepaymentAccount(enabled = true) {
  const [account, setAccount] = useState<RepaymentAccount | null>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    listeners.add(setAccount);
    load().catch((err) => setError(err?.response?.data?.message || 'Could not load repayment account'));
    return () => {
      listeners.delete(setAccount);
    };
  }, [enabled]);

  return { account, loading: enabled && !account && !error, error };
}
