import { clearSessionCookie } from "@/lib/auth";
import { ok } from "@/lib/api-response";

export async function POST() {
  await clearSessionCookie();
  return ok(null, "Signed out successfully.");
}
