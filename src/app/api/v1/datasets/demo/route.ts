import fs from "node:fs";
import path from "node:path";
import { db } from "@/db";
import { locations, wasteRecords } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { parseFileBuffer, validateRows } from "@/lib/upload/validate";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Loads the bundled synthetic demo dataset (data/sample/wastewise_campus_dataset.csv)
 * through the SAME validation + commit pipeline used for real uploads, and
 * clearly marks every inserted record with isDemo = true.
 */
export async function POST() {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;

  const filePath = path.join(process.cwd(), "data", "sample", "wastewise_campus_dataset.csv");
  if (!fs.existsSync(filePath)) {
    return Errors.server("Demo dataset file is not available on this deployment.");
  }

  const buffer = fs.readFileSync(filePath);
  const rows = parseFileBuffer(buffer, "wastewise_campus_dataset.csv");
  const validation = validateRows(rows);

  if (validation.validRecords.length === 0) {
    return Errors.server("Demo dataset could not be validated.");
  }

  const existingLocations = await db
    .select()
    .from(locations)
    .where(eq(locations.organizationId, auth.user.organizationId));
  const locationMap = new Map(existingLocations.map((l) => [l.name.toLowerCase(), l.id]));

  const uniqueLocationNames = Array.from(new Set(validation.validRecords.map((r) => r.location)));
  for (const name of uniqueLocationNames) {
    if (!locationMap.has(name.toLowerCase())) {
      const [created] = await db
        .insert(locations)
        .values({ organizationId: auth.user.organizationId, name, type: "general" })
        .returning();
      locationMap.set(name.toLowerCase(), created.id);
    }
  }

  const values = validation.validRecords.map((r) => ({
    organizationId: auth.user.organizationId,
    locationId: locationMap.get(r.location.toLowerCase())!,
    date: r.date,
    wasteCategory: r.wasteCategory,
    quantityKg: r.quantityKg,
    peopleCount: r.peopleCount,
    mealsServed: r.mealsServed,
    eventFlag: r.eventFlag,
    previousWasteKg: r.previousWasteKg,
    disposalMethod: r.disposalMethod,
    isDemo: true,
    createdBy: auth.user.id,
  }));

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const batch = values.slice(i, i + CHUNK);
    await db.insert(wasteRecords).values(batch);
    inserted += batch.length;
  }

  return ok({ inserted }, "DEMO DATA loaded successfully.", 201);
}

export async function DELETE() {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const { and } = await import("drizzle-orm");
  await db
    .delete(wasteRecords)
    .where(and(eq(wasteRecords.organizationId, auth.user.organizationId), eq(wasteRecords.isDemo, true)));

  return ok(null, "Demo data removed.");
}
