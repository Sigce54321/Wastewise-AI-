import { getCategoryBreakdown, getHotspots, getAnalyticsSummary } from "./ml/analytics";
import { detectAnomalies } from "./ml/anomaly";
import { runForecast } from "./ml/forecasting";
import { retrieveEvidence } from "./rag/rag-service";
import { graniteStructuredInsight, GraniteNotConfiguredError, GraniteRequestError } from "./granite";
import { round } from "./ml/stats";

export interface CandidateFinding {
  category: string | null;
  priority: "Low" | "Medium" | "High" | "Critical";
  findingSeed: string;
  evidenceText: string;
  ragQuery: string;
}

export async function buildCandidateFindings(organizationId: string): Promise<CandidateFinding[]> {
  const findings: CandidateFinding[] = [];

  const [categories, hotspots, anomalies, forecast, summary] = await Promise.all([
    getCategoryBreakdown({ organizationId }),
    getHotspots({ organizationId }),
    detectAnomalies(organizationId),
    runForecast(organizationId),
    getAnalyticsSummary({ organizationId }),
  ]);

  if (categories.length > 0) {
    const top = categories[0];
    findings.push({
      category: top.category,
      priority: top.percentage > 40 ? "High" : "Medium",
      findingSeed: `${top.category} is the largest waste category, accounting for ${top.percentage}% of total recorded waste (${top.totalKg} kg).`,
      evidenceText: `Category breakdown (organization-wide): ${categories
        .slice(0, 5)
        .map((c) => `${c.category}: ${c.totalKg} kg (${c.percentage}%)`)
        .join("; ")}.`,
      ragQuery: `reducing ${top.category.toLowerCase()} waste in institutional settings`,
    });
  }

  if (hotspots.hasData && hotspots.overall.length > 0) {
    const top = hotspots.overall[0];
    findings.push({
      category: null,
      priority: "Medium",
      findingSeed: `${top.locationName} is the highest-waste location, generating ${top.totalKg} kg in the analyzed period.`,
      evidenceText: `Location hotspot ranking: ${hotspots.overall
        .map((h) => `${h.locationName}: ${h.totalKg} kg`)
        .join("; ")}.`,
      ragQuery: `institutional waste hotspot location reduction strategy`,
    });
  }

  const recentAnomalies = anomalies.slice(0, 5);
  if (recentAnomalies.length > 0) {
    const a = recentAnomalies[0];
    findings.push({
      category: a.category,
      priority: a.severity === "Critical" || a.severity === "High" ? "Critical" : "Medium",
      findingSeed: `An anomaly was detected: ${a.category} waste at ${a.locationName} on ${a.date} was ${a.observedKg} kg, outside the expected range of ${a.expectedLow}-${a.expectedHigh} kg (flagged by ${a.methods.join(", ")}).`,
      evidenceText: `Anomaly detail: location=${a.locationName}, category=${a.category}, date=${a.date}, observed=${a.observedKg}kg, expected_range=${a.expectedLow}-${a.expectedHigh}kg, deviation=${a.deviation}kg, severity=${a.severity}, detection_methods=${a.methods.join(", ")}.`,
      ragQuery: `unusual waste increase investigation ${a.category}`,
    });
  }

  if (forecast.status === "ok") {
    const recentAvg =
      forecast.historical.slice(-7).reduce((a, b) => a + b.quantityKg, 0) / Math.min(7, forecast.historical.length);
    const forecastAvg = forecast.forecast.reduce((a, b) => a + b.predictedKg, 0) / forecast.forecast.length;
    const changePct = recentAvg > 0 ? ((forecastAvg - recentAvg) / recentAvg) * 100 : 0;
    if (Math.abs(changePct) > 8) {
      findings.push({
        category: null,
        priority: changePct > 20 ? "High" : "Medium",
        findingSeed: `The ${forecast.chosenModel.replace(/_/g, " ")} forecast projects a ${round(changePct, 1)}% ${changePct > 0 ? "increase" : "decrease"} in total waste over the next 7 days versus the recent 7-day average.`,
        evidenceText: `Forecast model: ${forecast.chosenModel}, test RMSE: ${forecast.evaluations.find((e) => e.model === forecast.chosenModel)?.rmse}, recent 7-day average: ${round(recentAvg, 2)}kg/day, forecast 7-day average: ${round(forecastAvg, 2)}kg/day.`,
        ragQuery: `preventing rising institutional waste trend`,
      });
    }
  }

  if (summary.hasData && summary.wastePerPerson) {
    findings.push({
      category: "Food",
      priority: "Low",
      findingSeed: `Current organization-wide waste intensity is ${summary.wastePerPerson} kg per person across ${summary.daySpan} recorded days.`,
      evidenceText: `Waste intensity: ${summary.wastePerPerson} kg/person, total waste: ${summary.totalWaste}kg, food waste share: ${summary.foodWaste}kg.`,
      ragQuery: `food waste per person reduction institutional cafeteria`,
    });
  }

  return findings.slice(0, 4);
}

export interface GeneratedRecommendation {
  priority: CandidateFinding["priority"];
  category: string | null;
  finding: string;
  evidence: string;
  recommendationText: string;
  expectedImpactDirection: string;
  confidence: string;
  source: string;
  limitations: string;
}

export async function generateRecommendationsFromEvidence(
  organizationId: string,
): Promise<{ status: "ok"; recommendations: GeneratedRecommendation[] } | { status: "not_configured" } | { status: "error"; message: string }> {
  const findings = await buildCandidateFindings(organizationId);
  if (findings.length === 0) {
    return { status: "ok", recommendations: [] };
  }

  const results: GeneratedRecommendation[] = [];

  for (const finding of findings) {
    const ragChunks = await retrieveEvidence(finding.ragQuery, organizationId, 3);
    const ragEvidence = ragChunks
      .map((c) => `[${c.source} — ${c.documentTitle}] ${c.content}`)
      .join("\n\n");

    try {
      const insight = await graniteStructuredInsight({
        finding: finding.findingSeed,
        evidenceText: finding.evidenceText,
        ragEvidence,
        taskInstruction: `Based on the finding "${finding.findingSeed}", propose exactly one specific, actionable waste-reduction recommendation for this organization.`,
      });

      results.push({
        priority: finding.priority,
        category: finding.category,
        finding: insight.finding,
        evidence: insight.evidence,
        recommendationText: insight.recommendation,
        expectedImpactDirection: insight.expectedImpactDirection,
        confidence: insight.confidence,
        source: insight.source,
        limitations: insight.limitations,
      });
    } catch (err) {
      if (err instanceof GraniteNotConfiguredError) {
        return { status: "not_configured" };
      }
      if (err instanceof GraniteRequestError) {
        // Continue attempting other findings rather than failing the whole batch.
        continue;
      }
      throw err;
    }
  }

  if (results.length === 0) {
    return { status: "error", message: "AI service could not generate recommendations at this time." };
  }

  return { status: "ok", recommendations: results };
}
