import { requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { parseFileBuffer, validateRows } from "@/lib/upload/validate";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  const auth = await requireRole("manager");
  if ("error" in auth) return auth.error;

  const formData = await request.formData().catch(() => null);
  if (!formData) return Errors.validation("Expected multipart/form-data with a 'file' field.");

  const file = formData.get("file");
  if (!file || !(file instanceof File)) return Errors.validation("No file uploaded.");

  if (file.size > MAX_FILE_SIZE) return Errors.validation("File exceeds the 10MB size limit.");

  const allowedExtensions = [".csv", ".xlsx", ".xls"];
  if (!allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return Errors.validation("Only CSV and XLSX files are supported.");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Parsed fully in memory; the original file buffer is never persisted to disk.
    const rows = parseFileBuffer(buffer, file.name);
    const result = validateRows(rows);
    return ok(result, "File validated.");
  } catch (err) {
    return Errors.validation(
      err instanceof Error ? err.message : "Could not parse the uploaded file.",
    );
  }
}
