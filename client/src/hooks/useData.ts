import { useState, useEffect, useCallback } from 'react';
import type { UseQueryResult, UseMutationResult } from '../lib/api/types';

export function useQuery<T>(fetcher: () => Promise<{data: T}>, deps: any[] = []): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetcher();
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useMutation<T>(mutator: (data: any) => Promise<{data: T}>): UseMutationResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (data: any) => {
    try {
      setIsLoading(true);
      const response = await mutator(data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};
