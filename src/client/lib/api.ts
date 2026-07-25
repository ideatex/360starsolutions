import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  // If we are in production but the URL points to localhost, fall back to relative path
  if (process.env.NODE_ENV === 'production' && envUrl && envUrl.includes('localhost')) {
    return '/api/v1';
  }
  return envUrl || '/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
