"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, BookOpen } from "lucide-react";
import { Card, Badge } from "@/components/ui/Primitives";
import { api, ApiError } from "@/lib/api-client";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; source: string; category?: string }[];
  isError?: boolean;
}

const SUGGESTIONS = [
  "Why has waste increased?",
  "Which location generates the most waste?",
  "Which category should be prioritized?",
  "What does the forecast indicate?",
  "How should plastic waste be managed?",
  "Summarize this month's waste performance.",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post<any>("/api/v1/rag/query", { question });
      setMessages((m) => [...m, { role: "assistant", content: res.answer, sources: res.sources }]);
    } catch (err) {
      const message =
        err instanceof ApiError && err.message === "AI service not configured"
          ? "AI service not configured. Please set GRANITE_API_KEY, GRANITE_PROJECT_ID, GRANITE_API_URL and GRANITE_MODEL to enable WasteWise Intelligence."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: message, isError: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
          <Sparkles size={22} className="text-forest-600" /> WasteWise Intelligence
        </h1>
        <p className="text-sm text-charcoal-500">
          Ask questions about your organization's waste data. Answers are grounded in your ML analytics and a
          retrieved reference corpus.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden !p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
                <Sparkles size={22} />
              </div>
              <p className="max-w-sm text-sm text-charcoal-500">
                Ask a question about your waste data, forecasts, anomalies, or hotspots.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-forest-200 bg-white px-3 py-1.5 text-xs text-forest-700 hover:bg-forest-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-forest-700 text-white"
                    : m.isError
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-forest-50 text-charcoal-800"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-forest-200/50 pt-2">
                    {m.sources.map((s, si) => (
                      <span key={si} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-forest-700">
                        <BookOpen size={10} /> {s.source}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-forest-50 px-4 py-2.5 text-sm text-charcoal-600">
                <Loader2 size={14} className="animate-spin" /> Retrieving sustainability evidence...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-forest-100 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask WasteWise Intelligence..."
            className="flex-1 rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700 text-white hover:bg-forest-800 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </Card>
    </div>
  );
}
