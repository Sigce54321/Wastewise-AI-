import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { getTrend } from "@/lib/ml/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const granularity = (searchParams.get("granularity") as "daily" | "weekly" | "monthly") || "daily";

  const trend = await getTrend(
    {
      organizationId: auth.user.organizationId,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      locationId: searchParams.get("locationId") || undefined,
      category: searchParams.get("category") || undefined,
    },
    granularity,
  );

  return ok({ granularity, points: trend });
}
