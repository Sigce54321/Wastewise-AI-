import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { getHotspots } from "@/lib/ml/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const data = await getHotspots({ organizationId: auth.user.organizationId });
  return ok(data);
}
