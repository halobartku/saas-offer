export interface ForecastPoint {
  date: Date;
  value: number;
}

export interface ForecastResult {
  forecast: ForecastPoint[];
  confidence: {
    upper: ForecastPoint[];
    lower: ForecastPoint[];
  };
  trend: "up" | "down" | "neutral";
  reliability: "high" | "medium" | "low";
}
