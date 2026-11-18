// api.js
// One shared axios instance for every REST call.
// An interceptor adds the JWT from localStorage to each request, so components
// never have to build the Authorization header themselves.
import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Helper to turn an axios error into a readable message
export const errorText = (err, fallback = 'Something went wrong') =>
  err.response?.data?.error || (navigator.onLine ? fallback : 'You are offline');

export default api;
