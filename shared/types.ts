export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Offer {
  id: string;
  clientId: string;
  products: OfferProduct[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferProduct {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
