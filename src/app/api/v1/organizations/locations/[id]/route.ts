import { db } from "@/db";
import { locations } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Errors.validation("Invalid input.");

  const [updated] = await db
    .update(locations)
    .set(parsed.data)
    .where(and(eq(locations.id, id), eq(locations.organizationId, auth.user.organizationId)))
    .returning();

  if (!updated) return Errors.notFound("Location");
  return ok(updated, "Location updated.");
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const [deleted] = await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.organizationId, auth.user.organizationId)))
    .returning();

  if (!deleted) return Errors.notFound("Location");
  return ok(null, "Location deleted.");
}
