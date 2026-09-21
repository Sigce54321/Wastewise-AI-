import { db } from "@/db";
import { wasteRecords } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  quantityKg: z.number().positive().optional(),
  peopleCount: z.number().int().nonnegative().nullable().optional(),
  mealsServed: z.number().int().nonnegative().nullable().optional(),
  eventFlag: z.boolean().optional(),
  disposalMethod: z.string().nullable().optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Errors.validation("Invalid input.");

  const [updated] = await db
    .update(wasteRecords)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(wasteRecords.id, id), eq(wasteRecords.organizationId, auth.user.organizationId)))
    .returning();

  if (!updated) return Errors.notFound("Waste record");
  return ok(updated, "Waste record updated.");
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const [deleted] = await db
    .delete(wasteRecords)
    .where(and(eq(wasteRecords.id, id), eq(wasteRecords.organizationId, auth.user.organizationId)))
    .returning();

  if (!deleted) return Errors.notFound("Waste record");
  return ok(null, "Waste record deleted.");
}
