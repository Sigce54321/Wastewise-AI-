import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Primitives";

const FAQ = [
  {
    q: "How do I get started?",
    a: "Upload a CSV or XLSX waste dataset from the Upload page, or click 'Load Demo Dataset' to instantly explore WasteWise AI with clearly labeled synthetic campus data.",
  },
  {
    q: "What columns does my file need?",
    a: "Required columns: date, location, waste_category, quantity_kg. Optional: people_count, meals_served, event_flag, disposal_method. Waste categories must be one of: Food, Paper, Plastic, Glass, Metal, E-Waste, Other.",
  },
  {
    q: "Why does Predictions say 'Insufficient data for forecasting'?",
    a: "Forecasting requires at least 24 days of daily records for the selected location/category scope so the model has enough history to learn lag and rolling-average features.",
  },
  {
    q: "Why are there no anomalies showing?",
    a: "Anomaly detection needs at least 8 historical records for a specific location+category combination to establish a statistical baseline (IQR, Z-score, Isolation Forest).",
  },
  {
    q: "Why does the Assistant or Recommendations say 'AI service not configured'?",
    a: "WasteWise AI uses IBM Granite (via watsonx.ai) as its reasoning layer. An administrator must set GRANITE_API_KEY, GRANITE_PROJECT_ID, GRANITE_API_URL and GRANITE_MODEL as environment variables for these features to generate real AI output.",
  },
  {
    q: "How is the WasteWise Risk Score calculated?",
    a: "It combines your waste trend, recent anomaly count, waste intensity, and forecast trajectory into a single 0-100 indicator. It is an internal analytical signal, not an official regulatory score.",
  },
  {
    q: "Is my organization's data isolated from other organizations?",
    a: "Yes. Every waste record, analytic, forecast, anomaly, and recommendation is scoped strictly to your organization_id on every request, enforced independently on the server.",
  },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
          <HelpCircle size={22} className="text-forest-600" /> Help
        </h1>
        <p className="text-sm text-charcoal-500">Quick answers to common questions about using WasteWise AI.</p>
      </div>

      <div className="space-y-3">
        {FAQ.map((item) => (
          <Card key={item.q}>
            <p className="text-sm font-semibold text-charcoal-900">{item.q}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-charcoal-600">{item.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
