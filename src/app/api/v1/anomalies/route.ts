import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { detectAnomalies } from "@/lib/ml/anomaly";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const anomalies = await detectAnomalies(auth.user.organizationId);
  return ok({ anomalies, count: anomalies.length });
}
