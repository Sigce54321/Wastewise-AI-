import { db } from "@/db";
import { recommendations } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { eq, desc } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { generateRecommendationsFromEvidence } from "@/lib/recommendation-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.organizationId, auth.user.organizationId))
    .orderBy(desc(recommendations.createdAt));

  return ok(rows);
}

export async function POST() {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;

  const rl = rateLimit(`recgen:${auth.user.organizationId}`, 5, 60_000);
  if (!rl.allowed) return Errors.validation("Too many recommendation requests. Please wait a minute.");

  const result = await generateRecommendationsFromEvidence(auth.user.organizationId);

  if (result.status === "not_configured") {
    return Errors.validation("AI service not configured");
  }
  if (result.status === "error") {
    return Errors.server(result.message);
  }

  if (result.recommendations.length === 0) {
    return ok([], "Not enough evidence yet to generate recommendations. Upload more waste data.");
  }

  const inserted = await db
    .insert(recommendations)
    .values(
      result.recommendations.map((r) => ({
        organizationId: auth.user.organizationId,
        priority: r.priority,
        category: r.category,
        finding: r.finding,
        evidence: r.evidence,
        recommendationText: r.recommendationText,
        expectedImpactDirection: r.expectedImpactDirection,
        confidence: r.confidence,
        source: r.source,
        limitations: r.limitations,
        status: "New",
      })),
    )
    .returning();

  return ok(inserted, "Recommendations generated.", 201);
}
