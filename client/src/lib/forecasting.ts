import { exponentialSmoothing, calculateSeasonality } from "./algorithms";
import type { ForecastResult } from "../types/forecast";

export interface TimeSeriesPoint {
  date: Date;
  value: number;
}

export function analyzeSeasonality(data: TimeSeriesPoint[]): number[] {
  if (data.length < 12) return [];
  return calculateSeasonality(data.map(d => d.value));
}

export function generateForecast(
  historicalData: TimeSeriesPoint[],
  periods: number = 3
): ForecastResult {
  if (historicalData.length < 2) {
    return {
      forecast: [],
      confidence: { upper: [], lower: [] },
      trend: "neutral",
      reliability: "low"
    };
  }

  const values = historicalData.map(d => d.value);
  const lastDate = historicalData[historicalData.length - 1].date;
  
  // Calculate trend direction
  const recentValues = values.slice(-3);
  const trend = recentValues[recentValues.length - 1] > recentValues[0] 
    ? "up" 
    : recentValues[recentValues.length - 1] < recentValues[0]
    ? "down"
    : "neutral";

  // Simple exponential smoothing
  const alpha = 0.3; // Smoothing factor
  const forecast = exponentialSmoothing(values, alpha, periods);
  
  // Calculate confidence intervals (80% confidence)
  const std = calculateStandardDeviation(values);
  const z = 1.28; // z-score for 80% confidence
  const upper = forecast.map(f => f + z * std);
  const lower = forecast.map(f => f - z * std);

  // Calculate forecast dates
  const forecastDates = Array.from({ length: periods }, (_, i) => {
    const date = new Date(lastDate);
    date.setMonth(date.getMonth() + i + 1);
    return date;
  });

  // Assess reliability
  const reliability = assessReliability(historicalData.length, std / mean(values));

  return {
    forecast: forecast.map((value, i) => ({
      date: forecastDates[i],
      value: Math.max(0, value), // Ensure non-negative values
    })),
    confidence: {
      upper: upper.map((value, i) => ({
        date: forecastDates[i],
        value: Math.max(0, value),
      })),
      lower: lower.map((value, i) => ({
        date: forecastDates[i],
        value: Math.max(0, value),
      })),
    },
    trend,
    reliability,
  };
}

// Helper functions
function calculateStandardDeviation(values: number[]): number {
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function mean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function assessReliability(
  dataPoints: number,
  coefficientOfVariation: number
): "high" | "medium" | "low" {
  if (dataPoints < 6) return "low";
  if (coefficientOfVariation > 0.5) return "low";
  if (dataPoints >= 12 && coefficientOfVariation < 0.2) return "high";
  return "medium";
}
