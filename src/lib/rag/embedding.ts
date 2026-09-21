// A deterministic, dependency-free text embedding built with the classic
// "feature hashing" technique (signed hashing trick over token n-grams).
// This lets the RAG pipeline perform real semantic-ish retrieval even when
// no external embedding provider is configured. Vectors are L2-normalized
// so cosine similarity is equivalent to a dot product.

export const EMBEDDING_DIM = 256;

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "to", "of",
  "and", "or", "in", "on", "for", "with", "as", "by", "at", "this", "that",
  "it", "from", "will", "shall", "should", "can", "may", "must", "not",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function embedText(text: string): number[] {
  const tokens = tokenize(text);
  const vector = new Array(EMBEDDING_DIM).fill(0);

  const grams: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) {
    grams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  for (const gram of grams) {
    const h = hashString(gram);
    const index = h % EMBEDDING_DIM;
    const sign = h & 0x1 ? 1 : -1;
    vector[index] += sign;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
