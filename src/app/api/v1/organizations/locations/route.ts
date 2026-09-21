import { db } from "@/db";
import { locations, wasteRecords } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { eq, count } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(locations)
    .where(eq(locations.organizationId, auth.user.organizationId))
    .orderBy(locations.name);

  const counts = await db
    .select({ locationId: wasteRecords.locationId, value: count() })
    .from(wasteRecords)
    .where(eq(wasteRecords.organizationId, auth.user.organizationId))
    .groupBy(wasteRecords.locationId);
  const countMap = new Map(counts.map((c) => [c.locationId, c.value]));

  return ok(rows.map((r) => ({ ...r, recordCount: countMap.get(r.id) ?? 0 })));
}

const createSchema = z.object({
  name: z.string().min(1, "Location name is required."),
  type: z.string().min(1).default("general"),
});

export async function POST(request: Request) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid input.");

  const [location] = await db
    .insert(locations)
    .values({
      organizationId: auth.user.organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
    })
    .returning();

  return ok(location, "Location created.", 201);
}
