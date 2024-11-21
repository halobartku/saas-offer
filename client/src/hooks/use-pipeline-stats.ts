// /hooks/use-pipeline-stats.ts
import type { Offer } from "db/schema";

interface PipelineStats {
  totalValue: number;
  conversionRates: {
    sent: number;
    accepted: number;
  };
  avgTime: Record<string, number>;
}

export function usePipelineStats(offers?: Offer[]): PipelineStats {
  if (!offers) {
    return {
      totalValue: 0,
      conversionRates: { sent: 0, accepted: 0 },
      avgTime: {},
    };
  }

  const totalValue = offers.reduce(
    (sum, offer) => sum + (Number(offer.totalAmount) || 0),
    0,
  );

  const statusCounts = offers.reduce(
    (acc, offer) => {
      acc[offer.status] = (acc[offer.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const conversionRates = {
    sent: ((statusCounts.sent || 0) / (statusCounts.draft || 1)) * 100,
    accepted: ((statusCounts.accepted || 0) / (statusCounts.sent || 1)) * 100,
  };

  const avgTime = offers.reduce(
    (acc, offer) => {
      if (!offer.createdAt || !offer.updatedAt) return acc;

      const createdAt = new Date(offer.createdAt).getTime();
      const updatedAt = new Date(offer.updatedAt).getTime();
      const timeInStage = updatedAt - createdAt;

      acc[offer.status] = (acc[offer.status] || 0) + timeInStage;
      return acc;
    },
    {} as Record<string, number>,
  );

  Object.keys(avgTime).forEach((status) => {
    avgTime[status] =
      avgTime[status] / (statusCounts[status] || 1) / (1000 * 60 * 60 * 24);
  });

  return { totalValue, conversionRates, avgTime };
}
