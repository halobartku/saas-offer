import { useState, useEffect, useCallback } from 'react';
import { login as loginApi, getProfile } from '../lib/api';
import type { User } from '../../../shared/types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const { data } = await getProfile();
        if (data.success && data.data) {
          setUser(data.data);
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const { data } = await loginApi(email, password);
    if (data.success && data.data) {
      localStorage.setItem('token', data.data.token);
      setUser(data.data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, login, logout, isLoading };
};
