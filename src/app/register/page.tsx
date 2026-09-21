"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", form);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create workspace.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src="/images/hero-campus.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-forest-950/30" />
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700">
            <Leaf size={18} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-forest-900">WASTEWISE AI</span>
        </Link>

        <h1 className="text-2xl font-semibold text-charcoal-900">Create your workspace</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Set up your organization and start turning waste data into decisions.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-charcoal-700">Organization name</label>
            <input
              required
              value={form.organizationName}
              onChange={(e) => update("organizationName", e.target.value)}
              className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              placeholder="Greenview Institute"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-charcoal-700">Your name</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              placeholder="Jordan Lee"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-charcoal-700">Work email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              placeholder="you@organization.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-charcoal-700">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Create workspace
          </button>
        </form>

        <p className="mt-6 text-sm text-charcoal-500">
          Already have a workspace?{" "}
          <Link href="/login" className="font-medium text-forest-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
