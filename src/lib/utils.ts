export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatKg(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} t`;
  return `${value.toFixed(1)} kg`;
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

export function formatDate(value: string): string {
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#46825f",
  Plastic: "#c76b4a",
  Paper: "#c9a24b",
  Glass: "#5b9bd5",
  Metal: "#8b8fa3",
  "E-Waste": "#a24b7d",
  Other: "#6b7278",
};
