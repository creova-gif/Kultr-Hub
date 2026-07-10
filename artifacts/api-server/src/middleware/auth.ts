import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyToken } from "../lib/jwt.js";

export interface AuthedRequest extends Request {
  userId: string;
  userEmail: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    (req as AuthedRequest).userId = payload.userId;
    (req as AuthedRequest).userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Must run after requireAuth. A separate DB lookup rather than something
 * carried in the JWT — isAdmin has no self-serve grant path, and a 7-day
 * token should not be able to freeze in a privilege that was revoked on day
 * two. Only used on the small number of admin-gated routes, not every
 * authenticated request, to avoid adding a DB round-trip to the hot path.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = req as AuthedRequest;
  const [user] = await db.select({ isAdmin: usersTable.isAdmin }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.isAdmin) {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
