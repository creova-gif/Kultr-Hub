import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyToken } from "../lib/jwt.js";

export interface AuthedRequest extends Request {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
}

/**
 * Verifies the JWT, then checks its embedded tokenVersion against the
 * user's current value in the database — a deliberate DB round-trip on
 * every authenticated request, not something this codebase does lightly.
 * Without it, logout is unenforceable (a valid signature is a valid
 * signature for its full 7-day life no matter what the server does) and a
 * deleted account keeps a working token until natural expiry. isAdmin is
 * fetched in the same query so admin-gated routes don't need a second one.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select({ tokenVersion: usersTable.tokenVersion, isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId))
    .limit(1);

  // Same generic message either way — a deleted account and a revoked
  // token should look identical to the caller, not leak which occurred.
  if (!user || user.tokenVersion !== payload.tokenVersion) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const authed = req as AuthedRequest;
  authed.userId = payload.userId;
  authed.userEmail = payload.email;
  authed.isAdmin = user.isAdmin;
  next();
}

/** Must run after requireAuth, which already loaded isAdmin — no extra query here. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const { isAdmin } = req as AuthedRequest;
  if (!isAdmin) {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
