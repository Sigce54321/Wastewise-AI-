import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { getAnalyticsSummary, getCategoryBreakdown, getLocationBreakdown, getTrend } from "@/lib/ml/analytics";
import { detectAnomalies } from "@/lib/ml/anomaly";
import { runForecast } from "@/lib/ml/forecasting";
import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const organizationId = auth.user.organizationId;

  const [summary, categories, locationsBreakdown, trend, anomalies, forecast, recs] = await Promise.all([
    getAnalyticsSummary({ organizationId }),
    getCategoryBreakdown({ organizationId }),
    getLocationBreakdown({ organizationId }),
    getTrend({ organizationId }, "weekly"),
    detectAnomalies(organizationId),
    runForecast(organizationId),
    db
      .select()
      .from(recommendations)
      .where(eq(recommendations.organizationId, organizationId))
      .orderBy(desc(recommendations.createdAt))
      .limit(10),
  ]);

  return ok({
    generatedAt: new Date().toISOString(),
    summary,
    categories,
    locations: locationsBreakdown,
    weeklyTrend: trend,
    anomalies: anomalies.slice(0, 10),
    anomalyCount: anomalies.length,
    forecast,
    recommendations: recs,
  });
}
