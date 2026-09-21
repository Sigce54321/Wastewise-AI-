import { graniteConfig, isGraniteConfigured } from "./config";

export class GraniteNotConfiguredError extends Error {
  constructor() {
    super("AI service not configured");
    this.name = "GraniteNotConfiguredError";
  }
}

export class GraniteRequestError extends Error {
  constructor(message = "AI service is temporarily unavailable. Please try again shortly.") {
    super(message);
    this.name = "GraniteRequestError";
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getIamToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const response = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(
      graniteConfig.apiKey,
    )}`,
  });

  if (!response.ok) {
    throw new GraniteRequestError();
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export interface GraniteGenerationOptions {
  maxNewTokens?: number;
  temperature?: number;
}

/** Low-level call to the watsonx.ai Granite text generation endpoint. */
export async function graniteGenerateText(
  prompt: string,
  options: GraniteGenerationOptions = {},
): Promise<string> {
  if (!isGraniteConfigured()) {
    throw new GraniteNotConfiguredError();
  }

  let token: string;
  try {
    token = await getIamToken();
  } catch {
    throw new GraniteRequestError();
  }

  const baseUrl = graniteConfig.apiUrl.replace(/\/$/, "");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/ml/v1/text/generation?version=2024-05-31`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: graniteConfig.model,
        project_id: graniteConfig.projectId,
        input: prompt,
        parameters: {
          max_new_tokens: options.maxNewTokens ?? 600,
          temperature: options.temperature ?? 0.3,
          decoding_method: "greedy",
        },
      }),
    });
  } catch {
    throw new GraniteRequestError();
  }

  if (!response.ok) {
    // Never leak raw provider error bodies to clients.
    throw new GraniteRequestError();
  }

  const data = (await response.json()) as {
    results?: { generated_text?: string }[];
  };

  const text = data.results?.[0]?.generated_text;
  if (!text) throw new GraniteRequestError();
  return text.trim();
}

export interface StructuredAIOutput {
  finding: string;
  evidence: string;
  recommendation: string;
  expectedImpactDirection: "decrease" | "increase" | "neutral" | "unknown";
  source: string;
  confidence: "Low" | "Medium" | "High";
  limitations: string;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Granite architecture: waste data -> ML analysis -> structured evidence ->
 * (optional) RAG evidence -> Granite -> structured recommendation output.
 */
export async function graniteStructuredInsight(params: {
  finding: string;
  evidenceText: string;
  ragEvidence?: string;
  taskInstruction: string;
}): Promise<StructuredAIOutput> {
  const prompt = `You are WasteWise Intelligence, an evidence-grounded sustainability analyst for institutional waste management.
You must base your answer strictly on the DATA EVIDENCE and REFERENCE EVIDENCE provided below. Do not invent numbers, causes, or regulations that are not present in the evidence.

DATA EVIDENCE (from the organization's own ML analytics):
${params.evidenceText}

REFERENCE EVIDENCE (from trusted sustainability documents, may be empty):
${params.ragEvidence || "(no relevant reference documents retrieved)"}

TASK:
${params.taskInstruction}

Respond ONLY with a single valid JSON object with exactly these keys:
{
  "finding": "one sentence describing what the data shows",
  "evidence": "concise reference to the specific numbers/analysis supporting the finding",
  "recommendation": "one specific, actionable recommendation",
  "expected_impact_direction": "decrease" | "increase" | "neutral" | "unknown",
  "source": "ML Analytics" | "RAG Reference Corpus" | "ML Analytics + RAG Reference Corpus",
  "confidence": "Low" | "Medium" | "High",
  "limitations": "one sentence on data limitations or caveats"
}`;

  const raw = await graniteGenerateText(prompt, { maxNewTokens: 500, temperature: 0.2 });
  const parsed = extractJson(raw) as Partial<StructuredAIOutput> & {
    expected_impact_direction?: string;
  };

  if (!parsed || !parsed.finding || !parsed.recommendation) {
    throw new GraniteRequestError("AI service returned an unexpected response format.");
  }

  return {
    finding: String(parsed.finding),
    evidence: String(parsed.evidence ?? params.evidenceText),
    recommendation: String(parsed.recommendation),
    expectedImpactDirection: (parsed.expected_impact_direction as StructuredAIOutput["expectedImpactDirection"]) || "unknown",
    source: String(parsed.source ?? "ML Analytics"),
    confidence: (parsed.confidence as StructuredAIOutput["confidence"]) || "Medium",
    limitations: String(parsed.limitations ?? "Based on available organizational data only."),
  };
}

export async function graniteAssistantAnswer(params: {
  question: string;
  dataEvidence: string;
  ragEvidence: string;
}): Promise<string> {
  const prompt = `You are "WasteWise Intelligence", an AI assistant embedded in a waste management analytics platform.
Answer the user's question using ONLY the evidence provided. If the evidence is insufficient to answer confidently, say so honestly instead of guessing.
Cite specific numbers from the DATA EVIDENCE when relevant, and mention when you use the REFERENCE EVIDENCE.
Keep the answer concise (max 6 sentences), professional, and actionable.

DATA EVIDENCE:
${params.dataEvidence}

REFERENCE EVIDENCE:
${params.ragEvidence || "(no relevant reference documents retrieved)"}

QUESTION: ${params.question}

ANSWER:`;

  const text = await graniteGenerateText(prompt, { maxNewTokens: 400, temperature: 0.3 });
  return text;
}
