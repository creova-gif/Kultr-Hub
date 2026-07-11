import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, usersTable, otpCodesTable } from "@workspace/db";
import { signToken } from "../lib/jwt.js";
import { sendSms, isSmsConfigured } from "../lib/sms.js";
import { normalizeMsisdn } from "../lib/phone.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import type { Request, Response } from "express";

const router = Router();

const OTP_TTL_SECONDS = 600; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

// SMS costs money — cap OTP requests harder than the general auth limiter.
const otpRequestLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many code requests, please wait a minute." },
});

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function userPublic(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
    isCreator: user.isCreator,
    createdAt: user.createdAt,
  };
}

router.post("/signup", async (req: Request, res: Response) => {
  const { email, password, displayName, countryCode = "KE" } = req.body as {
    email: string;
    password: string;
    displayName: string;
    countryCode?: string;
  };

  if (!email || !password || !displayName) {
    res.status(400).json({ message: "email, password and displayName are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ message: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    displayName,
    countryCode,
  }).returning();

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      countryCode: user.countryCode,
      isCreator: user.isCreator,
      createdAt: user.createdAt,
    },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.passwordHash) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      countryCode: user.countryCode,
      isCreator: user.isCreator,
      createdAt: user.createdAt,
    },
  });
});

/**
 * POST /api/auth/otp/request
 * Phone-first auth: generate a one-time passcode and SMS it to the user.
 * In simulated mode (no SMS credentials) the code is returned as `devCode`.
 */
router.post("/otp/request", otpRequestLimiter, async (req: Request, res: Response) => {
  const { phone, countryCode } = req.body as { phone: string; countryCode?: string };

  if (!phone) {
    res.status(400).json({ message: "phone is required" });
    return;
  }

  let msisdn: string;
  try {
    msisdn = normalizeMsisdn(phone, countryCode);
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid phone number" });
    return;
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await db.insert(otpCodesTable).values({ phone: msisdn, codeHash, purpose: "login", expiresAt });

  const simulated = !isSmsConfigured();
  try {
    await sendSms({
      to: `+${msisdn}`,
      message: `Your Kultr Hub code is ${code}. It expires in 10 minutes.`,
    });
  } catch {
    res.status(502).json({ message: "Could not send the verification code. Try again." });
    return;
  }

  res.json({
    simulated,
    expiresInSeconds: OTP_TTL_SECONDS,
    // Only surfaced when no live gateway is configured (dev/demo).
    ...(simulated ? { devCode: code } : {}),
  });
});

/**
 * POST /api/auth/otp/verify
 * Verify a passcode and issue a JWT. Creates a phone-based account on first use.
 */
router.post("/otp/verify", async (req: Request, res: Response) => {
  const { phone, countryCode, code, displayName } = req.body as {
    phone: string;
    countryCode?: string;
    code: string;
    displayName?: string;
  };

  if (!phone || !code) {
    res.status(400).json({ message: "phone and code are required" });
    return;
  }

  let msisdn: string;
  try {
    msisdn = normalizeMsisdn(phone, countryCode);
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Invalid phone number" });
    return;
  }

  const [otp] = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.phone, msisdn),
        isNull(otpCodesTable.consumedAt),
        gt(otpCodesTable.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCodesTable.createdAt))
    .limit(1);

  if (!otp) {
    res.status(401).json({ message: "Code is invalid or has expired. Request a new one." });
    return;
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    res.status(429).json({ message: "Too many attempts. Request a new code." });
    return;
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await db
      .update(otpCodesTable)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(otpCodesTable.id, otp.id));
    res.status(401).json({ message: "Incorrect code." });
    return;
  }

  // Consume the code so it cannot be reused.
  await db.update(otpCodesTable).set({ consumedAt: new Date() }).where(eq(otpCodesTable.id, otp.id));

  // Find or create the phone-based account.
  let [user] = await db.select().from(usersTable).where(eq(usersTable.phone, msisdn)).limit(1);
  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        // Synthesize a placeholder email to satisfy the NOT NULL/UNIQUE
        // identity column; phone is the real identifier here.
        email: `${msisdn}@phone.kultr`,
        phone: msisdn,
        displayName: displayName?.trim() || `Member ${msisdn.slice(-4)}`,
        countryCode: countryCode ?? "KE",
      })
      .returning();
  }

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
  res.json({ token, user: userPublic(user) });
});

/**
 * Bumps tokenVersion, which immediately invalidates every outstanding token
 * for this user (this device and any other) — requireAuth compares the
 * embedded version against the current one on every request. Previously
 * this endpoint did nothing at all; a token remained fully valid for its
 * whole 7-day life regardless of "logging out".
 */
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  await db
    .update(usersTable)
    .set({ tokenVersion: sql`${usersTable.tokenVersion} + 1` })
    .where(eq(usersTable.id, userId));
  res.status(204).send();
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const authed = req as AuthedRequest;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, authed.userId)).limit(1);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
    isCreator: user.isCreator,
    createdAt: user.createdAt,
  });
});

export default router;
