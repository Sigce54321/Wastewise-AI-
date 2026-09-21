import { db } from "@/db";
import { impactFactors } from "@/db/schema";
import { requireUser } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { getAnalyticsSummary, getCategoryBreakdown } from "@/lib/ml/analytics";
import { or, eq, isNull } from "drizzle-orm";
import { round } from "@/lib/ml/stats";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  reductionPercent: z.number().min(0).max(100),
  periodDays: z.number().int().min(1).max(365),
  category: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid input.");

  const { reductionPercent, periodDays, category } = parsed.data;
  const organizationId = auth.user.organizationId;

  const summary = await getAnalyticsSummary({ organizationId, category });
  if (!summary.hasData) {
    return Errors.validation("No waste data yet. Upload data before running a simulation.");
  }

  const dailyAverage = summary.totalWaste / Math.max(1, summary.daySpan);
  const currentProjected = round(dailyAverage * periodDays, 2);
  const reducedWaste = round(currentProjected * (reductionPercent / 100), 2);
  const remainingWaste = round(currentProjected - reducedWaste, 2);

  const factors = await db
    .select()
    .from(impactFactors)
    .where(or(isNull(impactFactors.organizationId), eq(impactFactors.organizationId, organizationId)));

  const categories = category ? [category] : (await getCategoryBreakdown({ organizationId })).map((c) => c.category);

  function findFactor(metric: "co2e" | "cost") {
    // Prefer an organization-specific override, otherwise fall back to a global default.
    const candidates = factors.filter((f) => f.metric === metric && categories.includes(f.category));
    const orgSpecific = candidates.find((f) => f.organizationId === organizationId);
    return orgSpecific ?? candidates.find((f) => f.organizationId === null) ?? null;
  }

  const co2Factor = findFactor("co2e");
  const costFactor = findFactor("cost");

  return ok({
    currentProjectedWasteKg: currentProjected,
    reductionPercent,
    periodDays,
    reducedWasteKg: reducedWaste,
    remainingWasteKg: remainingWaste,
    co2eAvoided: co2Factor ? { value: round(reducedWaste * co2Factor.factorValue, 2), unit: co2Factor.unit, source: co2Factor.source } : null,
    costAvoided: costFactor ? { value: round(reducedWaste * costFactor.factorValue, 2), unit: costFactor.unit, source: costFactor.source } : null,
    disclaimer: "Scenario estimate — not a guaranteed outcome.",
  });
}
