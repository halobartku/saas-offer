import axios from 'axios';
import type { Client, Offer, Product, User, ApiResponse } from '../../../shared/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clients
export const getClients = () => api.get<ApiResponse<Client[]>>('/clients');
export const createClient = (data: Partial<Client>) => api.post<ApiResponse<Client>>('/clients', data);
export const updateClient = (id: string, data: Partial<Client>) => api.put<ApiResponse<Client>>(`/clients/${id}`, data);
export const deleteClient = (id: string) => api.delete<ApiResponse<void>>(`/clients/${id}`);

// Offers
export const getOffers = () => api.get<ApiResponse<Offer[]>>('/offers');
export const createOffer = (data: Partial<Offer>) => api.post<ApiResponse<Offer>>('/offers', data);
export const updateOffer = (id: string, data: Partial<Offer>) => api.put<ApiResponse<Offer>>(`/offers/${id}`, data);
export const deleteOffer = (id: string) => api.delete<ApiResponse<void>>(`/offers/${id}`);

// Products
export const getProducts = () => api.get<ApiResponse<Product[]>>('/products');
export const createProduct = (data: Partial<Product>) => api.post<ApiResponse<Product>>('/products', data);
export const updateProduct = (id: string, data: Partial<Product>) => api.put<ApiResponse<Product>>(`/products/${id}`, data);
export const deleteProduct = (id: string) => api.delete<ApiResponse<void>>(`/products/${id}`);

// Auth
export const login = (email: string, password: string) => api.post<ApiResponse<{token: string, user: User}>>('/auth/login', { email, password });
export const register = (data: { email: string; password: string; name: string }) => api.post<ApiResponse<{token: string, user: User}>>('/auth/register', data);
export const getProfile = () => api.get<ApiResponse<User>>('/auth/profile');
