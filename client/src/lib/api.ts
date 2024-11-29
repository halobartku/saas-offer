import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Auth API
export const auth = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

// Organizations API
export const organizations = {
  create: async (name: string) => {
    const response = await api.post('/organizations', { name });
    return response.data;
  },
  update: async (id: string, data: { name?: string; plan?: string }) => {
    const response = await api.put(`/organizations/${id}`, data);
    return response.data;
  },
  addMember: async (id: string, email: string, role: string) => {
    const response = await api.post(`/organizations/${id}/members`, { email, role });
    return response.data;
  },
};

// Products API
export const products = {
  create: async (data: any) => {
    const response = await api.post('/products', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  list: async () => {
    const response = await api.get('/products');
    return response.data;
  },
};

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle session expiration
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
