import { requireUser, requireRole } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { listDocuments, ingestDocument, ensureReferenceCorpusSeeded } from "@/lib/rag/rag-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  await ensureReferenceCorpusSeeded();
  const docs = await listDocuments(auth.user.organizationId);
  return ok(docs);
}

const schema = z.object({
  title: z.string().min(3),
  source: z.string().min(2),
  category: z.string().min(2),
  content: z.string().min(50),
});

export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid document.");

  const id = await ingestDocument({ ...parsed.data, organizationId: auth.user.organizationId });
  return ok({ id }, "Document ingested into the knowledge base.", 201);
}
