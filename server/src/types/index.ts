export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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

export interface Offer {
  id: string;
  clientId: string;
  status: string;
  totalAmount: number;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}
