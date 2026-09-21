import { db } from "@/db";
import { impactFactors } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { or, eq, isNull } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(impactFactors)
    .where(or(isNull(impactFactors.organizationId), eq(impactFactors.organizationId, auth.user.organizationId)));

  return ok(rows);
}

const schema = z.object({
  category: z.string().min(1),
  metric: z.enum(["co2e", "cost"]),
  factorValue: z.number(),
  unit: z.string().min(1),
  source: z.string().min(2),
  version: z.string().default("1.0"),
});

export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid factor.");

  const [created] = await db
    .insert(impactFactors)
    .values({ ...parsed.data, organizationId: auth.user.organizationId })
    .returning();

  return ok(created, "Impact factor saved.", 201);
}
