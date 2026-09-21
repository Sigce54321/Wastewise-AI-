"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Card, Button, Badge } from "@/components/ui/Primitives";

interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  missingValueRows: number;
  dataQualityScore: number;
  warnings: string[];
  invalid: { rowNumber: number; reason: string }[];
  preview: any[];
  validRecords: any[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setSuccess(null);
    setValidating(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const data = await api.postForm<ValidationResult>("/api/v1/datasets/validate", form);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not validate file.");
    } finally {
      setValidating(false);
    }
  }, []);

  async function handleCommit() {
    if (!result) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await api.post<{ inserted: number }>("/api/v1/datasets/commit", {
        records: result.validRecords,
      });
      setSuccess(`${res.inserted} waste records saved to PostgreSQL. Analytics have been refreshed.`);
      setResult(null);
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save records.");
    } finally {
      setCommitting(false);
    }
  }

  async function handleDemo() {
    setDemoLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<{ inserted: number }>("/api/v1/datasets/demo");
      setSuccess(`DEMO DATA loaded: ${res.inserted} synthetic campus waste records added. Visit the Dashboard to explore.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load demo data.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">Upload Waste Data</h1>
        <p className="text-sm text-charcoal-500">
          Upload CSV or XLSX files. Files are parsed in memory and never permanently stored — only validated records
          are saved to PostgreSQL.
        </p>
      </div>

      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-14 text-center transition-colors ${
            dragging ? "border-forest-500 bg-forest-50" : "border-forest-200 bg-forest-50/30 hover:bg-forest-50/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-100 text-forest-700">
            <UploadCloud size={26} />
          </div>
          <p className="text-sm font-medium text-charcoal-800">
            {file ? file.name : "Drag & drop a CSV or XLSX file, or click to browse"}
          </p>
          <p className="text-xs text-charcoal-400">
            Required columns: date, location, waste_category, quantity_kg (optional: people_count, meals_served,
            event_flag, disposal_method)
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-forest-100 pt-5">
          <div className="flex items-center gap-2 text-sm text-charcoal-500">
            <Sparkles size={16} className="text-forest-600" /> Or explore instantly with labeled synthetic data:
          </div>
          <Button variant="secondary" onClick={handleDemo} disabled={demoLoading}>
            {demoLoading && <Loader2 size={14} className="animate-spin" />} Load Demo Dataset
          </Button>
        </div>
      </Card>

      {validating && (
        <Card>
          <div className="flex items-center gap-3 text-sm text-charcoal-600">
            <Loader2 size={16} className="animate-spin text-forest-600" /> Processing dataset...
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-800">
          {success}
        </div>
      )}

      {result && (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-charcoal-900">Validation Result</h2>
            <Badge tone={result.dataQualityScore > 80 ? "success" : result.dataQualityScore > 50 ? "warning" : "danger"}>
              Data Quality Score: {result.dataQualityScore}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MiniStat label="Total Rows" value={result.totalRows} icon={<FileSpreadsheet size={14} />} />
            <MiniStat label="Valid Rows" value={result.validRows} icon={<CheckCircle2 size={14} className="text-forest-600" />} />
            <MiniStat label="Invalid Rows" value={result.invalidRows} icon={<XCircle size={14} className="text-red-600" />} />
            <MiniStat label="Duplicates" value={result.duplicateRows} icon={<AlertTriangle size={14} className="text-amber-600" />} />
            <MiniStat label="Missing Values" value={result.missingValueRows} icon={<AlertTriangle size={14} className="text-amber-600" />} />
          </div>

          {result.warnings.length > 0 && (
            <div className="space-y-1 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-800">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          {result.preview.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-forest-100">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="bg-forest-50 text-charcoal-500">
                  <tr>
                    {["Date", "Location", "Category", "Qty (kg)", "People", "Meals"].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((r, i) => (
                    <tr key={i} className="border-t border-forest-50">
                      <td className="px-3 py-1.5">{r.date}</td>
                      <td className="px-3 py-1.5">{r.location}</td>
                      <td className="px-3 py-1.5">{r.wasteCategory}</td>
                      <td className="px-3 py-1.5">{r.quantityKg}</td>
                      <td className="px-3 py-1.5">{r.peopleCount ?? "—"}</td>
                      <td className="px-3 py-1.5">{r.mealsServed ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-3 py-2 text-xs text-charcoal-400">
                Showing first {result.preview.length} of {result.validRows} valid rows.
              </p>
            </div>
          )}

          {result.invalid.length > 0 && (
            <details className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-3">
              <summary className="cursor-pointer text-xs font-medium text-red-700">
                View {result.invalid.length} rejected row(s)
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                {result.invalid.map((r, i) => (
                  <li key={i}>
                    Row {r.rowNumber}: {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex justify-end gap-3 border-t border-forest-100 pt-4">
            <Button variant="ghost" onClick={() => setResult(null)}>
              Cancel
            </Button>
            <Button onClick={handleCommit} disabled={committing || result.validRecords.length === 0}>
              {committing && <Loader2 size={14} className="animate-spin" />}
              Confirm & Save {result.validRecords.length} Records
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-forest-100 bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-charcoal-400">
        {icon} {label}
      </div>
      <p className="mt-1 text-lg font-semibold text-charcoal-900">{value}</p>
    </div>
  );
}
