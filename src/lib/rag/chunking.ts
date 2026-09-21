export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string, targetSize = 700, overlap = 120): string[] {
  const cleaned = cleanText(text);
  const paragraphs = cleaned.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > targetSize && current.length > 0) {
      chunks.push(current.trim());
      // start next chunk with overlap from the end of the previous chunk
      const overlapText = current.slice(Math.max(0, current.length - overlap));
      current = overlapText + "\n\n" + para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Guard against overly long single paragraphs
  return chunks.flatMap((chunk) => {
    if (chunk.length <= targetSize * 1.6) return [chunk];
    const parts: string[] = [];
    for (let i = 0; i < chunk.length; i += targetSize) {
      parts.push(chunk.slice(i, i + targetSize + overlap));
    }
    return parts;
  });
}
