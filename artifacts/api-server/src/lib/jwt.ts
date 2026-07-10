import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256" as const;
const JWT_EXPIRES_IN = "7d";

/**
 * Resolve the signing secret. There is deliberately NO hardcoded fallback: a
 * committed default silently signs production tokens with a public secret and
 * makes every account forgeable. We fail fast instead.
 *
 *  - Production: JWT_SECRET is required and must be at least 32 chars.
 *  - Non-production: if unset, a random per-process secret is generated so local
 *    dev works, but tokens do not survive a restart (which is correct for dev).
 */
function resolveSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!secret || secret.length < 32) {
      throw new Error(
        "JWT_SECRET must be set to a value of at least 32 characters in production.",
      );
    }
    return secret;
  }

  if (secret && secret.length >= 32) return secret;
  // Dev-only ephemeral secret — never used in production (guarded above).
  return `dev-only-${Math.random().toString(36).slice(2)}${Date.now()}`;
}

const JWT_SECRET = resolveSecret();

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
}
