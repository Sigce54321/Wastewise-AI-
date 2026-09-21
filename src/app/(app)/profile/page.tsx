"use client";

import { useEffect, useState } from "react";
import { UserCircle } from "lucide-react";
import { Card, Badge, LoadingBlock, EmptyState } from "@/components/ui/Primitives";
import { api } from "@/lib/api-client";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<any>("/api/v1/auth/me")
      .then(setUser)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <EmptyState title="Could not load profile" description={error} />;
  if (!user) return <LoadingBlock label="Loading profile..." />;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
          <UserCircle size={22} className="text-forest-600" /> Profile
        </h1>
        <p className="text-sm text-charcoal-500">Your account details within this WasteWise AI workspace.</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 text-xl font-semibold text-forest-700">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="text-lg font-semibold text-charcoal-900">{user.name}</p>
            <p className="text-sm text-charcoal-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-forest-100 pt-4">
          <div>
            <p className="text-xs font-medium text-charcoal-400">Role</p>
            <Badge tone="info">{user.role}</Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-charcoal-400">Organization</p>
            <p className="text-sm font-medium text-charcoal-800">{user.organization.name}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
