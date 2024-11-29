import useSWR, { SWRConfiguration } from 'swr';
import { useAuth } from '../contexts/AuthContext';

export function useSWRWithAuth<T>(path: string, config?: SWRConfiguration) {
  const { user } = useAuth();

  const fetcher = async (url: string) => {
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('An error occurred while fetching the data.');
    }
    return response.json();
  };

  return useSWR<T>(
    user ? path : null,
    fetcher,
    {
      ...config,
      revalidateOnFocus: false,
    }
  );
}
