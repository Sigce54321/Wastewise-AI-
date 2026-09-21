import { db } from "@/db";
import { organizations, users, wasteRecords } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { eq, count } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, auth.user.organizationId))
    .limit(1);

  if (!org) return Errors.notFound("Organization");

  const [memberCount] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.organizationId, org.id));

  const [recordCount] = await db
    .select({ value: count() })
    .from(wasteRecords)
    .where(eq(wasteRecords.organizationId, org.id));

  return ok({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt,
    memberCount: memberCount?.value ?? 0,
    wasteRecordCount: recordCount?.value ?? 0,
  });
}

const updateSchema = z.object({ name: z.string().min(2) });

export async function PATCH(request: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Errors.validation("Organization name is required.");

  const [updated] = await db
    .update(organizations)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(organizations.id, auth.user.organizationId))
    .returning();

  return ok(updated, "Organization updated.");
}
