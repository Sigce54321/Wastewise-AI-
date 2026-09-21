"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, Button, Badge, LoadingBlock, EmptyState } from "@/components/ui/Primitives";
import { api, ApiError } from "@/lib/api-client";

export default function OrganizationPage() {
  const [org, setOrg] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [adding, setAdding] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<any>("/api/v1/organizations/current"),
      api.get<any[]>("/api/v1/organizations/locations"),
      api.get<any[]>("/api/v1/organizations/members"),
    ])
      .then(([o, l, m]) => {
        setOrg(o);
        setLocations(l);
        setMembers(m);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocation.trim()) return;
    setAdding(true);
    try {
      const loc = await api.post<any>("/api/v1/organizations/locations", { name: newLocation, type: "general" });
      setLocations((prev) => [...prev, { ...loc, recordCount: 0 }]);
      setNewLocation("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add location.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteLocation(id: string) {
    try {
      await api.delete(`/api/v1/organizations/locations/${id}`);
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete location.");
    }
  }

  if (loading) return <LoadingBlock label="Loading organization..." />;
  if (error && !org) return <EmptyState title="Could not load organization" description={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
          <Building2 size={22} className="text-forest-600" /> Organization
        </h1>
        <p className="text-sm text-charcoal-500">Manage your workspace, locations, and team members.</p>
      </div>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-charcoal-400">Organization Name</p>
          <p className="mt-1 text-lg font-semibold text-charcoal-900">{org.name}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-charcoal-400">Team Members</p>
          <p className="mt-1 text-lg font-semibold text-charcoal-900">{org.memberCount}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-charcoal-400">Waste Records</p>
          <p className="mt-1 text-lg font-semibold text-charcoal-900">{org.wasteRecordCount}</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Locations</h3>
        <form onSubmit={addLocation} className="mb-4 flex gap-2">
          <input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="New location name (e.g. Main Canteen)"
            className="flex-1 rounded-xl border border-forest-200 px-3.5 py-2 text-sm"
          />
          <Button type="submit" disabled={adding}>
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </Button>
        </form>
        {locations.length === 0 ? (
          <EmptyState title="No locations yet." description="Add a location or upload data to auto-create locations." />
        ) : (
          <div className="divide-y divide-forest-50">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-charcoal-800">{l.name}</p>
                  <p className="text-xs text-charcoal-400">{l.recordCount} records</p>
                </div>
                <button onClick={() => deleteLocation(l.id)} className="rounded-lg p-1.5 text-charcoal-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Team Members</h3>
        <div className="divide-y divide-forest-50">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-charcoal-800">{m.name}</p>
                <p className="text-xs text-charcoal-400">{m.email}</p>
              </div>
              <Badge tone="neutral">{m.role}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
