// lib/requireUserId.ts
import { NextRequest } from "next/server";
import { SESSION_COOKIE, getUserIdByToken } from "@/lib/session";

export function requireUserId(req: NextRequest): string {
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  const auth = req.headers.get("authorization");
  const bearerToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const token = bearerToken ?? cookieToken;

  const uid = getUserIdByToken(token);
  if (!uid) throw new Error("UNAUTHORIZED");
  return uid;
}
