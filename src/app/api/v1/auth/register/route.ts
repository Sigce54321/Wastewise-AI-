import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { ok, Errors } from "@/lib/api-response";
import { rateLimit, getClientKey } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters."),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function POST(request: Request) {
  const rl = rateLimit(`register:${getClientKey(request)}`, 10, 60_000);
  if (!rl.allowed) return Errors.validation("Too many attempts. Please try again in a minute.");

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  const { name, email, password, organizationName } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    return Errors.validation("An account with this email already exists.");
  }

  let baseSlug = slugify(organizationName) || "organization";
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const clash = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (clash.length === 0) break;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: organizationName, slug })
    .returning();

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      organizationId: org.id,
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: "admin",
    })
    .returning();

  const token = await createSessionToken({
    userId: user.id,
    organizationId: org.id,
    role: "admin",
    email: user.email,
    name: user.name,
  });
  await setSessionCookie(token);

  return ok(
    {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      organization: { id: org.id, name: org.name, slug: org.slug },
    },
    "Workspace created successfully.",
    201,
  );
}
