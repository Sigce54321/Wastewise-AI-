import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/api-auth";
import { ok } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.organizationId, auth.user.organizationId))
    .orderBy(users.createdAt);

  return ok(members);
}
