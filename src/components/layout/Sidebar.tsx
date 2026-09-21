"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  UploadCloud,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Calculator,
  FileText,
  Settings,
  Building2,
  UserCircle,
  HelpCircle,
  Leaf,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/predictions", label: "Predictions", icon: TrendingUp },
      { href: "/anomalies", label: "Anomalies", icon: AlertTriangle },
      { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
    ],
  },
  {
    title: "WasteWise Intelligence",
    items: [
      { href: "/assistant", label: "Assistant", icon: Sparkles },
      { href: "/simulator", label: "Simulator", icon: Calculator },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/upload", label: "Upload Data", icon: UploadCloud },
      { href: "/organization", label: "Organization", icon: Building2 },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/profile", label: "Profile", icon: UserCircle },
      { href: "/help", label: "Help", icon: HelpCircle },
    ],
  },
];

export function Sidebar({ userName, orgName, role }: { userName: string; orgName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await api.post("/api/v1/auth/logout");
    router.push("/login");
    router.refresh();
  }

  const content = (
    <div className="flex h-full flex-col bg-forest-900 text-sand-100">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-500/90">
          <Leaf size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">WASTEWISE AI</p>
          <p className="text-[11px] text-forest-300">Waste Intelligence Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-forest-400">
              {section.title}
            </p>
            <div className="mt-2 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-forest-700/70 text-white font-medium"
                        : "text-forest-200 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="truncate text-xs text-forest-300">
            {orgName} · <span className="capitalize">{role}</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-forest-200 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-forest-100 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-700">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-forest-900">WASTEWISE AI</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50">
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg bg-white/10 p-1.5 text-white"
            >
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
