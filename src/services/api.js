// src/services/api.js

import axios from 'axios';

// ✅ Use deployed backend URL from Vercel env
const API = import.meta.env.VITE_API_URL;

// 🔥 Debug (remove later)
console.log("API URL:", API);

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Optional: attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Optional: handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;