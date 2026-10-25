import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureDatabase } from "@/db/bootstrap";
import type { SessionUser } from "@/lib/types";

const COOKIE_NAME = "bdg_session";
const SESSION_DAYS = 30;

function getSecret() {
  const raw = process.env.AUTH_SECRET ?? "bdg-trainer-development-secret-please-change";
  return new TextEncoder().encode(raw);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const isProd = process.env.NODE_ENV === "production";
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    // Allow the preview to work when embedded in an iframe (requires Secure + SameSite=None).
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  await ensureDatabase();
  const id = await getSessionUserId();
  if (!id) return null;
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, id));
  return user ?? null;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** For route handlers: returns the user or throws UnauthorizedError. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Требуется авторизация" }, { status: 401 });
}
