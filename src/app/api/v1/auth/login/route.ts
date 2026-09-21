import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { ok, Errors } from "@/lib/api-response";
import { rateLimit, getClientKey } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const rl = rateLimit(`login:${getClientKey(request)}`, 15, 60_000);
  if (!rl.allowed) return Errors.validation("Too many login attempts. Please try again in a minute.");

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Errors.validation("Please provide a valid email and password.");

  const { email, password } = parsed.data;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      passwordHash: users.passwordHash,
      organizationId: users.organizationId,
      orgName: organizations.name,
    })
    .from(users)
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (rows.length === 0) {
    return Errors.validation("Invalid email or password.");
  }

  const user = rows[0];
  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return Errors.validation("Invalid email or password.");
  }

  const token = await createSessionToken({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as "admin" | "manager" | "viewer",
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return ok(
    {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      organization: { id: user.organizationId, name: user.orgName },
    },
    "Signed in successfully.",
  );
}
