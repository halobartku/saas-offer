/**
 * Exponential smoothing implementation
 */
export function exponentialSmoothing(
  data: number[],
  alpha: number,
  periods: number
): number[] {
  if (data.length === 0) return [];
  
  let forecast = [data[0]];
  
  // Calculate smoothed values
  for (let i = 1; i < data.length; i++) {
    forecast.push(alpha * data[i] + (1 - alpha) * forecast[i - 1]);
  }
  
  // Generate future forecasts
  const futureForecast = [];
  let lastValue = forecast[forecast.length - 1];
  
  for (let i = 0; i < periods; i++) {
    futureForecast.push(lastValue);
  }
  
  return futureForecast;
}

/**
 * Calculate seasonality factors using ratio-to-moving-average method
 */
export function calculateSeasonality(data: number[]): number[] {
  if (data.length < 12) return [];
  
  // Calculate centered moving average
  const movingAverage = [];
  for (let i = 6; i < data.length - 6; i++) {
    const sum = data.slice(i - 6, i + 7).reduce((a, b) => a + b, 0);
    movingAverage.push(sum / 13);
  }
  
  // Calculate seasonal indices
  const seasonalIndices = [];
  for (let i = 0; i < movingAverage.length; i++) {
    seasonalIndices.push(data[i + 6] / movingAverage[i]);
  }
  
  // Average seasonal indices for each month
  const monthlyIndices = Array(12).fill(0);
  const monthCounts = Array(12).fill(0);
  
  for (let i = 0; i < seasonalIndices.length; i++) {
    const monthIndex = (i + 6) % 12;
    monthlyIndices[monthIndex] += seasonalIndices[i];
    monthCounts[monthIndex]++;
  }
  
  return monthlyIndices.map((sum, i) => 
    monthCounts[i] > 0 ? sum / monthCounts[i] : 1
  );
}
