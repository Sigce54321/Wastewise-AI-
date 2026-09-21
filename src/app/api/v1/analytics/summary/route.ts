import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { getAnalyticsSummary } from "@/lib/ml/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const summary = await getAnalyticsSummary({
    organizationId: auth.user.organizationId,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    locationId: searchParams.get("locationId") || undefined,
    category: searchParams.get("category") || undefined,
  });

  return ok(summary);
}
