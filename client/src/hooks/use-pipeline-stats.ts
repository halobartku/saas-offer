// /hooks/use-pipeline-stats.ts
import { useMemo } from "react";
import type { Offer } from "db/schema";
import { differenceInDays } from "date-fns";

export function usePipelineStats(offers?: Offer[]) {
  return useMemo(() => {
    if (!offers) {
      return {
        totalValue: 0,
        conversionRates: {
          sent: 0,
          accepted: 0,
        },
        avgTime: 0,
      };
    }

    // Total pipeline value - excluding rejected offers
    const activeOffers = offers.filter(
      (offer) => offer.status !== "rejected" && offer.totalAmount != null,
    );

    const totalValue = activeOffers.reduce(
      (sum, offer) => sum + (Number(offer.totalAmount) || 0),
      0,
    );

    // Conversion rates calculations
    const totalOffers = offers.length;
    const sentOffers = offers.filter((o) =>
      [
        "sent",
        "accepted",
        "rejected",
        "Close & Paid",
        "Paid & Delivered",
      ].includes(o.status),
    ).length;

    const acceptedOffers = offers.filter((o) =>
      ["accepted", "Close & Paid", "Paid & Delivered"].includes(o.status),
    ).length;

    const sentRate = totalOffers > 0 ? (sentOffers / totalOffers) * 100 : 0;
    const acceptedRate =
      sentOffers > 0 ? (acceptedOffers / sentOffers) * 100 : 0;

    // Average time in pipeline
    const completedOffers = offers.filter(
      (o) =>
        ["Close & Paid", "Paid & Delivered", "rejected"].includes(o.status) &&
        o.createdAt &&
        (o.lastContact || o.updatedAt),
    );

    const totalDays = completedOffers.reduce((sum, offer) => {
      const startDate = new Date(offer.createdAt!);
      const endDate = new Date(offer.lastContact || offer.updatedAt!);
      return sum + Math.max(0, differenceInDays(endDate, startDate));
    }, 0);

    const avgTime =
      completedOffers.length > 0 ? totalDays / completedOffers.length : 0;

    return {
      totalValue,
      conversionRates: {
        sent: Math.round(sentRate * 10) / 10, // Round to 1 decimal
        accepted: Math.round(acceptedRate * 10) / 10,
      },
      avgTime: Math.round(avgTime * 10) / 10,
    };
  }, [offers]);
}
