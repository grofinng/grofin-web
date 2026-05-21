import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('esena_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function extractApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const FILE_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080/api').replace(
  /\/api\/?$/,
  ''
);

export function fileUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILE_BASE}${path}`;
}
