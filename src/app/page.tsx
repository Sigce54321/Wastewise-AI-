import Link from "next/link";
import Image from "next/image";
import {
  Leaf,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Database,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Analytics that explain",
    description: "Category, location, and intensity analytics computed directly from your organization's own records.",
  },
  {
    icon: TrendingUp,
    title: "Real forecasting",
    description: "Moving average, linear regression, random forest, and gradient boosting models trained per organization.",
  },
  {
    icon: AlertTriangle,
    title: "Anomaly detection",
    description: "IQR, Z-score, and isolation forest methods flag unusual waste patterns before they become a trend.",
  },
  {
    icon: Sparkles,
    title: "Evidence-grounded AI",
    description: "IBM Granite reasons over your ML analytics and a retrieval-augmented reference corpus — never guesses.",
  },
  {
    icon: ShieldCheck,
    title: "Organization isolation",
    description: "Role-based access control keeps every workspace's data completely separate and secure.",
  },
  {
    icon: Database,
    title: "Built for real data",
    description: "Upload CSV/XLSX datasets with automatic validation, data-quality scoring, and duplicate detection.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700">
            <Leaf size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-forest-900">WASTEWISE AI</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-charcoal-700 hover:text-forest-800">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-800"
          >
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-forest-200 bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700">
            <Sparkles size={13} /> AI-Powered Waste Intelligence
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-charcoal-900 sm:text-5xl">
            Turn Waste Data Into Smarter Decisions.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-charcoal-600">
            WasteWise AI transforms institutional waste records into forecasts, anomaly alerts, hotspot insights, and
            evidence-grounded AI recommendations — so your team can prevent waste before it happens.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-forest-800"
            >
              Explore Dashboard <ArrowRight size={16} />
            </Link>
            <Link
              href="/login?demo=1"
              className="inline-flex items-center gap-2 rounded-xl border border-forest-200 bg-white px-5 py-3 text-sm font-medium text-forest-800 hover:bg-forest-50"
            >
              View Demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-charcoal-400">
            No credit card required. Demo Mode uses clearly labeled synthetic campus data.
          </p>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_24px_60px_rgba(20,40,30,0.18)]">
          <Image src="/images/hero-campus.jpg" alt="Modern sustainable campus" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950/40 via-transparent to-transparent" />
        </div>
      </section>

      <section className="border-y border-forest-100 bg-white/60 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-2xl font-semibold text-charcoal-900">Everything a sustainability team needs</h2>
          <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
            One platform — from data upload to forecasting, anomaly detection, and AI-grounded recommendations.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-forest-100 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                  <f.icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-charcoal-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-forest-900 px-8 py-12 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-xl font-semibold text-white">Ready to see your waste data differently?</h3>
            <p className="mt-1 text-sm text-forest-200">Create a workspace in under a minute — no setup required.</p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-forest-900 hover:bg-sand-50"
          >
            Explore Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-forest-100 py-8 text-center text-xs text-charcoal-400">
        © {new Date().getFullYear()} WasteWise AI. Software-only waste intelligence platform.
      </footer>
    </div>
  );
}
