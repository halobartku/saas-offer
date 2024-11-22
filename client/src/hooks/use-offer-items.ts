import { useState, useCallback } from "react";
import useSWR from "swr";
import type { OfferItem } from "db/schema";

export const useOfferItems = (offerId?: string) => {
  const [offerItems, setOfferItems] = useState<OfferItem[]>([]);

  const { data, error, mutate } = useSWR<OfferItem[]>(
    offerId ? `/api/offers/${offerId}/items` : null,
  );

  const fetchOfferItems = useCallback(async () => {
    if (offerId) {
      try {
        const items = await mutate();
        if (items) {
          setOfferItems(items);
        }
      } catch (error) {
        console.error("Error fetching offer items:", error);
      }
    }
  }, [offerId, mutate]);

  return {
    offerItems: data || offerItems,
    fetchOfferItems,
    isLoading: !error && !data,
    isError: error,
  };
};
