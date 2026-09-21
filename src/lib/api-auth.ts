import { getCurrentUser } from "./auth";
import { Errors } from "./api-response";
import type { UserRole } from "@/db/schema";

const ROLE_ORDER: UserRole[] = ["viewer", "manager", "admin"];

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<{ user: CurrentUser } | { error: Response }> {
  const user = await getCurrentUser();
  if (!user) return { error: Errors.unauthorized() };
  return { user: user as CurrentUser };
}

export async function requireRole(
  minimumRole: UserRole,
): Promise<{ user: CurrentUser } | { error: Response }> {
  const result = await requireUser();
  if ("error" in result) return result;

  const role = result.user.role as UserRole;
  if (ROLE_ORDER.indexOf(role) < ROLE_ORDER.indexOf(minimumRole)) {
    return { error: Errors.forbidden() };
  }
  return result;
}
