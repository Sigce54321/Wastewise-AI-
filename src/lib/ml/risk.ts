import { getAnalyticsSummary, getIntensity } from "./analytics";
import { detectAnomalies } from "./anomaly";
import { runForecast } from "./forecasting";
import { round } from "./stats";

export interface RiskFactor {
  label: string;
  contribution: number;
  detail: string;
}

export interface RiskResult {
  status: "ok";
  score: number;
  level: "Low" | "Moderate" | "High" | "Very High";
  factors: RiskFactor[];
  disclaimer: string;
}

export interface RiskUnavailable {
  status: "insufficient_data";
  message: string;
}

export async function computeRiskScore(organizationId: string): Promise<RiskResult | RiskUnavailable> {
  const summary = await getAnalyticsSummary({ organizationId });
  if (!summary.hasData || summary.daySpan < 10) {
    return {
      status: "insufficient_data",
      message:
        "A reliable WasteWise Risk Score cannot yet be calculated. Upload at least 10 days of waste data to enable this feature.",
    };
  }

  const factors: RiskFactor[] = [];

  // 1. Trend factor (0-30)
  const trendScore = Math.max(0, Math.min(30, (summary.trendPercent / 50) * 30));
  factors.push({
    label: "Waste trend",
    contribution: round(trendScore, 1),
    detail: `Waste volume changed ${summary.trendPercent > 0 ? "+" : ""}${summary.trendPercent}% between the first and second half of the available period.`,
  });

  // 2. Anomaly factor (0-30)
  const anomalies = await detectAnomalies(organizationId);
  const recentAnomalies = anomalies.filter((a) => {
    const d = new Date(a.date + "T00:00:00Z");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  });
  const anomalyScore = Math.min(30, recentAnomalies.length * 5);
  factors.push({
    label: "Recent anomalies",
    contribution: round(anomalyScore, 1),
    detail: `${recentAnomalies.length} anomalies detected in the last 30 days across all locations and categories.`,
  });

  // 3. Intensity factor (0-20)
  const intensity = await getIntensity({ organizationId });
  const intensityScore = intensity.wastePerPerson
    ? Math.min(20, Math.max(0, (intensity.wastePerPerson - 0.3) * 40))
    : 8; // neutral if unmeasurable
  factors.push({
    label: "Waste intensity",
    contribution: round(intensityScore, 1),
    detail: intensity.wastePerPerson
      ? `Current waste intensity is ${intensity.wastePerPerson} kg per person.`
      : "Waste-per-person could not be measured (missing headcount data).",
  });

  // 4. Forecast factor (0-20)
  const forecast = await runForecast(organizationId);
  let forecastScore = 10;
  let forecastDetail = "Forecast unavailable — treated as neutral.";
  if (forecast.status === "ok") {
    const recentAvg =
      forecast.historical.slice(-7).reduce((a, b) => a + b.quantityKg, 0) / Math.min(7, forecast.historical.length);
    const forecastAvg = forecast.forecast.reduce((a, b) => a + b.predictedKg, 0) / forecast.forecast.length;
    const increasePct = recentAvg > 0 ? ((forecastAvg - recentAvg) / recentAvg) * 100 : 0;
    forecastScore = Math.max(0, Math.min(20, (increasePct / 40) * 20));
    forecastDetail = `The 7-day forecast projects a ${increasePct > 0 ? "+" : ""}${round(increasePct, 1)}% change versus the recent 7-day average.`;
  }
  factors.push({ label: "Forecast trajectory", contribution: round(forecastScore, 1), detail: forecastDetail });

  const totalScore = Math.round(factors.reduce((a, b) => a + b.contribution, 0));
  const clamped = Math.max(0, Math.min(100, totalScore));

  let level: RiskResult["level"] = "Low";
  if (clamped > 80) level = "Very High";
  else if (clamped > 60) level = "High";
  else if (clamped > 30) level = "Moderate";

  return {
    status: "ok",
    score: clamped,
    level,
    factors,
    disclaimer:
      "WasteWise Risk Score is an internal analytical indicator derived from your organization's own data. It is not an official government, regulatory, or UN certification score.",
  };
}
