import { getCurrentUser } from "@/lib/auth";
import { ok, Errors } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Errors.unauthorized();

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: { id: user.organizationId, name: user.orgName, slug: user.orgSlug },
  });
}
