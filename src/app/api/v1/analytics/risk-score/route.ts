import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { computeRiskScore } from "@/lib/ml/risk";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const data = await computeRiskScore(auth.user.organizationId);
  return ok(data);
}
