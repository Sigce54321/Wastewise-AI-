import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-forest-100 bg-white/90 p-5 shadow-[0_1px_2px_rgba(20,40,30,0.04),0_8px_24px_rgba(20,40,30,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-charcoal-50 text-charcoal-700 border-charcoal-400/20",
    success: "bg-forest-50 text-forest-700 border-forest-300/40",
    warning: "bg-sand-200 text-[#8a5a1c] border-sand-300",
    danger: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const variants: Record<string, string> = {
    primary: "bg-forest-700 text-white hover:bg-forest-800 shadow-sm",
    secondary: "bg-white text-forest-800 border border-forest-200 hover:bg-forest-50",
    ghost: "bg-transparent text-charcoal-700 hover:bg-charcoal-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneColor: Record<string, string> = {
    neutral: "text-charcoal-900",
    success: "text-forest-700",
    warning: "text-[#8a5a1c]",
    danger: "text-red-700",
  };
  return (
    <Card className="animate-fade-in">
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", toneColor[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-charcoal-400">{hint}</p>}
    </Card>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-forest-100 bg-white/60 py-16 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-200 border-t-forest-600" />
      <p className="text-sm text-charcoal-600">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-forest-200 bg-forest-50/40 py-16 text-center">
      <p className="text-base font-semibold text-charcoal-800">{title}</p>
      <p className="max-w-sm text-sm text-charcoal-500">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/60 py-12 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}
