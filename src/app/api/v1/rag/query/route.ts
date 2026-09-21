import { db } from "@/db";
import { assistantMessages } from "@/db/schema";
import { requireUser } from "@/lib/api-auth";
import { ok, Errors } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { retrieveEvidence } from "@/lib/rag/rag-service";
import { graniteAssistantAnswer, GraniteNotConfiguredError, GraniteRequestError } from "@/lib/granite";
import { getAnalyticsSummary, getCategoryBreakdown, getLocationBreakdown } from "@/lib/ml/analytics";
import { detectAnomalies } from "@/lib/ml/anomaly";
import { runForecast } from "@/lib/ml/forecasting";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ question: z.string().min(3).max(500) });

async function buildDataEvidence(organizationId: string): Promise<string> {
  const [summary, categories, locationsBreakdown, anomalies, forecast] = await Promise.all([
    getAnalyticsSummary({ organizationId }),
    getCategoryBreakdown({ organizationId }),
    getLocationBreakdown({ organizationId }),
    detectAnomalies(organizationId),
    runForecast(organizationId),
  ]);

  if (!summary.hasData) {
    return "No waste data has been uploaded for this organization yet.";
  }

  const parts: string[] = [];
  parts.push(
    `Summary: total waste ${summary.totalWaste}kg over ${summary.daySpan} days (${summary.dateRange?.start} to ${summary.dateRange?.end}), food waste ${summary.foodWaste}kg, recyclable waste ${summary.recyclableWaste}kg, trend ${summary.trendPercent}% (first half vs second half).`,
  );
  if (categories.length) {
    parts.push(
      `Category breakdown: ${categories.map((c) => `${c.category} ${c.totalKg}kg (${c.percentage}%)`).join(", ")}.`,
    );
  }
  if (locationsBreakdown.length) {
    parts.push(
      `Top locations by waste: ${locationsBreakdown
        .slice(0, 5)
        .map((l) => `${l.locationName} ${l.totalKg}kg`)
        .join(", ")}.`,
    );
  }
  if (anomalies.length) {
    parts.push(
      `Recent anomalies (${anomalies.length} total): ${anomalies
        .slice(0, 3)
        .map((a) => `${a.category} at ${a.locationName} on ${a.date} (${a.observedKg}kg, severity ${a.severity})`)
        .join("; ")}.`,
    );
  } else {
    parts.push("No anomalies currently detected.");
  }
  if (forecast.status === "ok") {
    parts.push(
      `7-day forecast (${forecast.chosenModel.replace(/_/g, " ")}): ${forecast.forecast
        .map((f) => `${f.date}: ${f.predictedKg}kg`)
        .join(", ")}.`,
    );
  } else {
    parts.push("Forecast not available: insufficient historical data.");
  }

  return parts.join("\n");
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rl = rateLimit(`assistant:${auth.user.organizationId}`, 20, 60_000);
  if (!rl.allowed) return Errors.validation("Too many assistant requests. Please wait a moment.");

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Errors.validation("Please provide a question (3-500 characters).");

  const { question } = parsed.data;

  const [dataEvidence, ragChunks] = await Promise.all([
    buildDataEvidence(auth.user.organizationId),
    retrieveEvidence(question, auth.user.organizationId, 4),
  ]);

  const ragEvidence = ragChunks
    .map((c) => `[${c.source} — ${c.documentTitle}] ${c.content}`)
    .join("\n\n");

  await db.insert(assistantMessages).values({
    organizationId: auth.user.organizationId,
    userId: auth.user.id,
    role: "user",
    content: question,
  });

  try {
    const answer = await graniteAssistantAnswer({ question, dataEvidence, ragEvidence });

    await db.insert(assistantMessages).values({
      organizationId: auth.user.organizationId,
      userId: auth.user.id,
      role: "assistant",
      content: answer,
      sources: ragChunks.map((c) => ({ title: c.documentTitle, source: c.source })),
    });

    return ok({
      answer,
      sources: ragChunks.map((c) => ({ title: c.documentTitle, source: c.source, category: c.category })),
      dataEvidenceUsed: dataEvidence,
    });
  } catch (err) {
    if (err instanceof GraniteNotConfiguredError) {
      return Errors.validation("AI service not configured");
    }
    if (err instanceof GraniteRequestError) {
      return Errors.server(err.message);
    }
    throw err;
  }
}

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { eq, desc } = await import("drizzle-orm");
  const history = await db
    .select()
    .from(assistantMessages)
    .where(eq(assistantMessages.organizationId, auth.user.organizationId))
    .orderBy(desc(assistantMessages.createdAt))
    .limit(50);

  return ok(history.reverse());
}
