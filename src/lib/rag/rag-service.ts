import { db } from "@/db";
import { documents, documentChunks } from "@/db/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { chunkText } from "./chunking";
import { embedText, cosineSimilarity } from "./embedding";
import { SEED_DOCUMENTS } from "./documents-seed";

export async function ensureReferenceCorpusSeeded(): Promise<void> {
  const existing = await db
    .select({ id: documents.id })
    .from(documents)
    .where(isNull(documents.organizationId))
    .limit(1);

  if (existing.length > 0) return;

  for (const doc of SEED_DOCUMENTS) {
    await ingestDocument({
      title: doc.title,
      source: doc.source,
      category: doc.category,
      content: doc.content,
      organizationId: null,
    });
  }
}

export async function ingestDocument(params: {
  title: string;
  source: string;
  category: string;
  content: string;
  organizationId: string | null;
}): Promise<string> {
  const [doc] = await db
    .insert(documents)
    .values({
      title: params.title,
      source: params.source,
      category: params.category,
      content: params.content,
      organizationId: params.organizationId,
    })
    .returning({ id: documents.id });

  const chunks = chunkText(params.content);
  if (chunks.length === 0) return doc.id;

  await db.insert(documentChunks).values(
    chunks.map((content, index) => ({
      documentId: doc.id,
      chunkIndex: index,
      content,
      embedding: embedText(content),
    })),
  );

  return doc.id;
}

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  source: string;
  category: string;
  content: string;
  score: number;
}

/** Semantic retrieval: query -> embed -> cosine similarity over scoped chunks. */
export async function retrieveEvidence(
  query: string,
  organizationId: string,
  topK = 4,
): Promise<RetrievedChunk[]> {
  await ensureReferenceCorpusSeeded();

  const rows = await db
    .select({
      chunkId: documentChunks.id,
      documentId: documentChunks.documentId,
      content: documentChunks.content,
      embedding: documentChunks.embedding,
      documentTitle: documents.title,
      source: documents.source,
      category: documents.category,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(or(isNull(documents.organizationId), eq(documents.organizationId, organizationId)));

  if (rows.length === 0) return [];

  const queryVector = embedText(query);
  const scored = rows.map((r) => ({
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    source: r.source,
    category: r.category,
    content: r.content,
    score: cosineSimilarity(queryVector, r.embedding as number[]),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((r) => r.score > 0.02);
}

export async function listDocuments(organizationId: string) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      source: documents.source,
      category: documents.category,
      organizationId: documents.organizationId,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(or(isNull(documents.organizationId), eq(documents.organizationId, organizationId)))
    .orderBy(documents.createdAt);
}
