import { db } from "@/db";
import { wasteRecords, locations } from "@/db/schema";
import { requireUser, requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { and, eq, gte, lte, desc, count } from "drizzle-orm";
import { z } from "zod";
import { wasteCategoryValues } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const locationId = searchParams.get("locationId") || undefined;
  const category = searchParams.get("category") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "25")));

  const conditions = [eq(wasteRecords.organizationId, auth.user.organizationId)];
  if (startDate) conditions.push(gte(wasteRecords.date, startDate));
  if (endDate) conditions.push(lte(wasteRecords.date, endDate));
  if (locationId) conditions.push(eq(wasteRecords.locationId, locationId));
  if (category) conditions.push(eq(wasteRecords.wasteCategory, category));

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(wasteRecords)
    .where(and(...conditions));

  const rows = await db
    .select({
      id: wasteRecords.id,
      date: wasteRecords.date,
      locationId: wasteRecords.locationId,
      locationName: locations.name,
      wasteCategory: wasteRecords.wasteCategory,
      quantityKg: wasteRecords.quantityKg,
      peopleCount: wasteRecords.peopleCount,
      mealsServed: wasteRecords.mealsServed,
      eventFlag: wasteRecords.eventFlag,
      disposalMethod: wasteRecords.disposalMethod,
      isDemo: wasteRecords.isDemo,
      createdAt: wasteRecords.createdAt,
    })
    .from(wasteRecords)
    .innerJoin(locations, eq(wasteRecords.locationId, locations.id))
    .where(and(...conditions))
    .orderBy(desc(wasteRecords.date))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return ok({ records: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 });
}

const createSchema = z.object({
  date: z.string().min(1),
  locationId: z.string().uuid(),
  wasteCategory: z.enum(wasteCategoryValues),
  quantityKg: z.number().positive(),
  peopleCount: z.number().int().nonnegative().nullable().optional(),
  mealsServed: z.number().int().nonnegative().nullable().optional(),
  eventFlag: z.boolean().optional(),
  previousWasteKg: z.number().nonnegative().nullable().optional(),
  disposalMethod: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid input.");

  const [location] = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, parsed.data.locationId), eq(locations.organizationId, auth.user.organizationId)))
    .limit(1);
  if (!location) return Errors.validation("Location does not belong to your organization.");

  const [record] = await db
    .insert(wasteRecords)
    .values({
      organizationId: auth.user.organizationId,
      locationId: parsed.data.locationId,
      date: parsed.data.date,
      wasteCategory: parsed.data.wasteCategory,
      quantityKg: parsed.data.quantityKg,
      peopleCount: parsed.data.peopleCount ?? null,
      mealsServed: parsed.data.mealsServed ?? null,
      eventFlag: parsed.data.eventFlag ?? false,
      previousWasteKg: parsed.data.previousWasteKg ?? null,
      disposalMethod: parsed.data.disposalMethod ?? null,
      createdBy: auth.user.id,
    })
    .returning();

  return ok(record, "Waste record created.", 201);
}
