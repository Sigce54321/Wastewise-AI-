import { db } from "@/db";
import { locations, wasteRecords, wasteCategoryValues } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const recordSchema = z.object({
  date: z.string().min(1),
  location: z.string().min(1),
  wasteCategory: z.enum(wasteCategoryValues),
  quantityKg: z.number().positive(),
  peopleCount: z.number().int().nonnegative().nullable().optional(),
  mealsServed: z.number().int().nonnegative().nullable().optional(),
  eventFlag: z.boolean().optional(),
  previousWasteKg: z.number().nonnegative().nullable().optional(),
  disposalMethod: z.string().nullable().optional(),
});

const commitSchema = z.object({
  records: z.array(recordSchema).min(1).max(20000),
  isDemo: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = commitSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid payload.");
  }

  const { records, isDemo } = parsed.data;

  const existingLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.organizationId, auth.user.organizationId));
  const locationMap = new Map(existingLocations.map((l) => [l.name.toLowerCase(), l.id]));

  const uniqueLocationNames = Array.from(new Set(records.map((r) => r.location)));
  for (const name of uniqueLocationNames) {
    if (!locationMap.has(name.toLowerCase())) {
      const [created] = await db
        .insert(locations)
        .values({ organizationId: auth.user.organizationId, name, type: "general" })
        .returning();
      locationMap.set(name.toLowerCase(), created.id);
    }
  }

  const values = records.map((r) => ({
    organizationId: auth.user.organizationId,
    locationId: locationMap.get(r.location.toLowerCase())!,
    date: r.date,
    wasteCategory: r.wasteCategory,
    quantityKg: r.quantityKg,
    peopleCount: r.peopleCount ?? null,
    mealsServed: r.mealsServed ?? null,
    eventFlag: r.eventFlag ?? false,
    previousWasteKg: r.previousWasteKg ?? null,
    disposalMethod: r.disposalMethod ?? null,
    isDemo: isDemo ?? false,
    createdBy: auth.user.id,
  }));

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const batch = values.slice(i, i + CHUNK);
    await db.insert(wasteRecords).values(batch);
    inserted += batch.length;
  }

  return ok({ inserted, locationsCreated: uniqueLocationNames.length }, "Waste records saved.", 201);
}
