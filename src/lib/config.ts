// Centralized runtime configuration. Never expose these values to client code.

export const AUTH_COOKIE_NAME = "wastewise_session";

export const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || "";

export function getJwtSecretKey(): Uint8Array {
  const secret =
    JWT_SECRET && JWT_SECRET.length >= 16
      ? JWT_SECRET
      : "dev-only-insecure-fallback-secret-change-me-32chars";
  return new TextEncoder().encode(secret);
}

export const graniteConfig = {
  apiKey: process.env.GRANITE_API_KEY || "",
  projectId: process.env.GRANITE_PROJECT_ID || "",
  apiUrl: process.env.GRANITE_API_URL || "",
  model: process.env.GRANITE_MODEL || "ibm/granite-3-8b-instruct",
};

export function isGraniteConfigured(): boolean {
  return Boolean(graniteConfig.apiKey && graniteConfig.projectId && graniteConfig.apiUrl);
}
