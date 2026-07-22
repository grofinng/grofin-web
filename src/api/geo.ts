// Country / state / city lookups via the free CountriesNow API
// (https://countriesnow.space). Results are cached per session.
// The bundled Nigeria dataset acts as an offline fallback so the
// application form keeps working if the API is unreachable.

import { NIGERIA_STATES, lgasForState } from '../data/nigeria';

const BASE = 'https://countriesnow.space/api/v0.1';

const cache = new Map<string, string[]>();

interface CnEnvelope<T> {
  error: boolean;
  msg: string;
  data: T;
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`${BASE}${path}${qs}`);
  if (!res.ok) throw new Error(`Geo API error ${res.status}`);
  const json = (await res.json()) as CnEnvelope<T>;
  if (json.error) throw new Error(json.msg || 'Geo API error');
  return json.data;
}

const sorted = (list: string[]) =>
  Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));

export const geoApi = {
  async countries(): Promise<string[]> {
    const key = 'countries';
    if (cache.has(key)) return cache.get(key)!;
    try {
      const data = await get<{ name: string }[]>('/countries/positions');
      const names = sorted(data.map((c) => c.name));
      cache.set(key, names);
      return names;
    } catch {
      return ['Nigeria'];
    }
  },

  async states(country: string): Promise<string[]> {
    const key = `states:${country}`;
    if (cache.has(key)) return cache.get(key)!;
    try {
      const data = await get<{ states: { name: string }[] }>('/countries/states/q', { country });
      const names = sorted(data.states.map((s) => s.name));
      cache.set(key, names);
      return names;
    } catch (err) {
      if (country === 'Nigeria') {
        const names = NIGERIA_STATES.map((s) => s.name);
        cache.set(key, names);
        return names;
      }
      throw err;
    }
  },

  async cities(country: string, state: string): Promise<string[]> {
    const key = `cities:${country}:${state}`;
    if (cache.has(key)) return cache.get(key)!;
    // The API suffixes Nigerian states with " State" — retry without it.
    const attempt = (s: string) => get<string[]>('/countries/state/cities/q', { country, state: s });
    try {
      const list = sorted(
        await attempt(state).catch(() => attempt(state.replace(/ state$/i, '')))
      );
      if (list.length === 0) throw new Error('No cities returned');
      cache.set(key, list);
      return list;
    } catch (err) {
      if (country === 'Nigeria') {
        const lgas = lgasForState(state.replace(/ state$/i, ''));
        if (lgas.length > 0) {
          cache.set(key, lgas);
          return lgas;
        }
      }
      throw err;
    }
  },
};
