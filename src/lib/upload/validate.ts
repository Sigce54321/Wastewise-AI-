import Papa from "papaparse";
import * as XLSX from "xlsx";
import { wasteCategoryValues } from "@/db/schema";

export interface RawRow {
  [key: string]: unknown;
}

export interface ValidatedRecord {
  date: string;
  location: string;
  wasteCategory: string;
  quantityKg: number;
  peopleCount: number | null;
  mealsServed: number | null;
  eventFlag: boolean;
  previousWasteKg: number | null;
  disposalMethod: string | null;
}

export interface RowIssue {
  rowNumber: number;
  reason: string;
  raw: RawRow;
}

export interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  missingValueRows: number;
  dataQualityScore: number;
  warnings: string[];
  invalid: RowIssue[];
  preview: ValidatedRecord[];
  validRecords: ValidatedRecord[];
}

const REQUIRED_COLUMNS = ["date", "location", "waste_category", "quantity_kg"];
const COLUMN_ALIASES: Record<string, string> = {
  date: "date",
  location: "location",
  waste_category: "waste_category",
  category: "waste_category",
  quantity_kg: "quantity_kg",
  quantity: "quantity_kg",
  people_count: "people_count",
  headcount: "people_count",
  meals_served: "meals_served",
  event_flag: "event_flag",
  previous_waste_kg: "previous_waste_kg",
  disposal_method: "disposal_method",
};

function normalizeHeaders(rows: RawRow[]): RawRow[] {
  return rows.map((row) => {
    const normalized: RawRow = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_");
      const mapped = COLUMN_ALIASES[cleanKey] ?? cleanKey;
      normalized[mapped] = value;
    }
    return normalized;
  });
}

export function parseFileBuffer(buffer: Buffer, filename: string): RawRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
    return normalizeHeaders(parsed.data);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
    return normalizeHeaders(rows);
  }
  throw new Error("Unsupported file type. Please upload a CSV or XLSX file.");
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const str = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(str);
}

function parseDate(value: unknown): string | null {
  const str = String(value ?? "").trim();
  if (!str) return null;

  // Handle Excel serial dates
  if (/^\d+(\.\d+)?$/.test(str) && Number(str) > 20000 && Number(str) < 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function validateRows(rows: RawRow[]): ValidationResult {
  const warnings: string[] = [];
  const invalid: RowIssue[] = [];
  const validRecords: ValidatedRecord[] = [];
  const seenKeys = new Set<string>();
  let duplicateRows = 0;
  let missingValueRows = 0;

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      missingValueRows: 0,
      dataQualityScore: 0,
      warnings: ["The file contains no data rows."],
      invalid: [],
      preview: [],
      validRecords: [],
    };
  }

  const headerKeys = Object.keys(rows[0] ?? {});
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headerKeys.includes(c));
  if (missingColumns.length > 0) {
    warnings.push(`Missing required column(s): ${missingColumns.join(", ")}.`);
  }

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // account for header row in the source file
    const reasons: string[] = [];

    const date = parseDate(row.date);
    if (!date) reasons.push("Invalid or missing date.");

    const location = String(row.location ?? "").trim();
    if (!location) reasons.push("Missing location.");

    const categoryRaw = String(row.waste_category ?? "").trim();
    const category = wasteCategoryValues.find(
      (c) => c.toLowerCase() === categoryRaw.toLowerCase(),
    );
    if (!category) {
      reasons.push(
        `Invalid waste_category "${categoryRaw}". Expected one of: ${wasteCategoryValues.join(", ")}.`,
      );
    }

    const quantityRaw = row.quantity_kg;
    const quantity = Number(quantityRaw);
    if (quantityRaw === undefined || quantityRaw === "" || Number.isNaN(quantity)) {
      reasons.push("Missing or non-numeric quantity_kg.");
    } else if (quantity < 0) {
      reasons.push("quantity_kg cannot be negative.");
    } else if (quantity === 0) {
      reasons.push("quantity_kg is zero.");
    }

    const peopleCountRaw = row.people_count;
    const peopleCount =
      peopleCountRaw === undefined || peopleCountRaw === "" ? null : Number(peopleCountRaw);
    if (peopleCount !== null && (Number.isNaN(peopleCount) || peopleCount < 0)) {
      reasons.push("people_count must be a non-negative number.");
    }

    const mealsServedRaw = row.meals_served;
    const mealsServed =
      mealsServedRaw === undefined || mealsServedRaw === "" ? null : Number(mealsServedRaw);
    if (mealsServed !== null && (Number.isNaN(mealsServed) || mealsServed < 0)) {
      reasons.push("meals_served must be a non-negative number.");
    }

    const previousWasteRaw = row.previous_waste_kg;
    const previousWasteKg =
      previousWasteRaw === undefined || previousWasteRaw === "" ? null : Number(previousWasteRaw);
    if (previousWasteKg !== null && Number.isNaN(previousWasteKg)) {
      reasons.push("previous_waste_kg must be numeric.");
    }

    if (!peopleCount && !mealsServed) {
      missingValueRows++;
    }

    if (reasons.length > 0) {
      invalid.push({ rowNumber, reason: reasons.join(" "), raw: row });
      return;
    }

    const dedupeKey = `${date}::${location.toLowerCase()}::${category}`;
    if (seenKeys.has(dedupeKey)) {
      duplicateRows++;
      invalid.push({
        rowNumber,
        reason: "Duplicate row (same date, location and category already present in file).",
        raw: row,
      });
      return;
    }
    seenKeys.add(dedupeKey);

    validRecords.push({
      date: date!,
      location,
      wasteCategory: category!,
      quantityKg: quantity,
      peopleCount,
      mealsServed,
      eventFlag: parseBoolean(row.event_flag),
      previousWasteKg,
      disposalMethod: row.disposal_method ? String(row.disposal_method).trim() : null,
    });
  });

  const totalRows = rows.length;
  const validCount = validRecords.length;
  const invalidCount = invalid.length;

  if (missingValueRows > 0) {
    warnings.push(`${missingValueRows} row(s) are missing both people_count and meals_served.`);
  }
  if (duplicateRows > 0) {
    warnings.push(`${duplicateRows} duplicate row(s) were excluded.`);
  }

  const qualityPenalty = totalRows > 0 ? (invalidCount / totalRows) * 100 : 0;
  const dataQualityScore = Math.max(0, Math.round(100 - qualityPenalty));

  return {
    totalRows,
    validRows: validCount,
    invalidRows: invalidCount,
    duplicateRows,
    missingValueRows,
    dataQualityScore,
    warnings,
    invalid: invalid.slice(0, 200),
    preview: validRecords.slice(0, 20),
    validRecords,
  };
}
