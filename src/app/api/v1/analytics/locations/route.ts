import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { getLocationBreakdown } from "@/lib/ml/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const data = await getLocationBreakdown({
    organizationId: auth.user.organizationId,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    category: searchParams.get("category") || undefined,
  });

  return ok(data);
}
