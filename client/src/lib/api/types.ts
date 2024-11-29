import type { Client, Offer, Product, User } from '../../../shared/types';

export interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseMutationResult<T> {
  mutate: (data: any) => Promise<T>;
  isLoading: boolean;
  error: Error | null;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}
