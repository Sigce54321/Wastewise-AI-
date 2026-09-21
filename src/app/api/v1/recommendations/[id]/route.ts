import { db } from "@/db";
import { recommendations, feedback, recommendationStatusValues } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(recommendationStatusValues),
  comment: z.string().max(1000).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;
  const { id } = await context.params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Errors.validation("Invalid status.");

  const [existing] = await db
    .select()
    .from(recommendations)
    .where(and(eq(recommendations.id, id), eq(recommendations.organizationId, auth.user.organizationId)))
    .limit(1);
  if (!existing) return Errors.notFound("Recommendation");

  const [updated] = await db
    .update(recommendations)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(recommendations.id, id))
    .returning();

  await db.insert(feedback).values({
    recommendationId: id,
    userId: auth.user.id,
    action: parsed.data.status,
    comment: parsed.data.comment ?? null,
  });

  return ok(updated, "Recommendation updated.");
}
