"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDemo = searchParams.get("demo") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700">
            <Leaf size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-forest-900">WASTEWISE AI</span>
        </Link>

        <h1 className="text-2xl font-semibold text-charcoal-900">Welcome back</h1>
        <p className="mt-1 text-sm text-charcoal-500">Sign in to your organization's WasteWise workspace.</p>

        {isDemo && (
          <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-xs text-forest-700">
            Create a free workspace, then use <strong>Demo Mode</strong> from the Upload page to explore WasteWise AI
            with clearly labeled synthetic campus data.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-charcoal-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              placeholder="you@organization.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-charcoal-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="mt-6 text-sm text-charcoal-500">
          Don't have a workspace?{" "}
          <Link href="/register" className="font-medium text-forest-700 hover:underline">
            Create one
          </Link>
        </p>
      </div>

      <div className="relative hidden lg:block">
        <Image src="/images/auth-side.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-forest-950/30" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
