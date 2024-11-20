import { useState, useCallback } from "react";
import useSWR from "swr";
import type { OfferItem } from "db/schema";

export function useOfferItems(offerId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: offerItems, mutate } = useSWR<OfferItem[]>(
    offerId ? `/api/offers/${offerId}/items` : null
  );

  const fetchOfferItems = useCallback(async () => {
    if (!offerId) return;
    
    setIsLoading(true);
    try {
      await mutate();
    } catch (error) {
      console.error("Failed to fetch offer items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [offerId, mutate]);

  return {
    offerItems,
    isLoading,
    fetchOfferItems,
  };
}
