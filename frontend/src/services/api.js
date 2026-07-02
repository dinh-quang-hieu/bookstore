import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password) => api.post('/auth/register', { email, password }),
};

export const booksApi = {
  getAll: () => api.get('/books'),
  getOne: (id) => api.get(`/books/${id}`),
  create: (data) => api.post('/books', data),
  update: (id, data) => api.put(`/books/${id}`, data),
  delete: (id) => api.delete(`/books/${id}`),
};

export const ordersApi = {
  place: (items) => api.post('/orders', { items }),
  getAll: () => api.get('/orders'),
};

export default api;
