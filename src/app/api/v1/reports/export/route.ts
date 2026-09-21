import { requireUser } from "@/lib/api-auth";
import { db } from "@/db";
import { wasteRecords, locations } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select({
      date: wasteRecords.date,
      location: locations.name,
      category: wasteRecords.wasteCategory,
      quantityKg: wasteRecords.quantityKg,
      peopleCount: wasteRecords.peopleCount,
      mealsServed: wasteRecords.mealsServed,
      eventFlag: wasteRecords.eventFlag,
      disposalMethod: wasteRecords.disposalMethod,
      isDemo: wasteRecords.isDemo,
    })
    .from(wasteRecords)
    .innerJoin(locations, eq(wasteRecords.locationId, locations.id))
    .where(and(eq(wasteRecords.organizationId, auth.user.organizationId)))
    .orderBy(desc(wasteRecords.date));

  const header = "date,location,category,quantity_kg,people_count,meals_served,event_flag,disposal_method,is_demo";
  const lines = rows.map((r) =>
    [r.date, r.location, r.category, r.quantityKg, r.peopleCount, r.mealsServed, r.eventFlag, r.disposalMethod, r.isDemo]
      .map(csvEscape)
      .join(","),
  );
  const csv = [header, ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="wastewise-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
