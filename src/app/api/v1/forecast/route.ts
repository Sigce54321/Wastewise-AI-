import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { runForecast } from "@/lib/ml/forecasting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId") || undefined;
  const category = searchParams.get("category") || undefined;

  const result = await runForecast(auth.user.organizationId, locationId, category);
  return ok(result);
}
