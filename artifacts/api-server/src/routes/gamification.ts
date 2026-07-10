import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  questsTable,
  userQuestProgressTable,
  kultroinWalletsTable,
  kultroinLedgerTable,
  collectibleInventoryTable,
  kultrPassSubscriptionsTable,
  perksTable,
  userPerkUnlocksTable,
  eventCheckinsTable,
  eventsTable,
  ticketsTable,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { award, processCheckin, getMultiplier, InsufficientFundsError } from "../lib/gamification.js";
import type { Request, Response } from "express";

const router = Router();

/* ── GET /quests/progress ─────────────────────────────────────────────────
 * Full gamification state for the signed-in user: wallet balance, KULTR PASS
 * multiplier, every active quest with progress, overall completion, and owned
 * collectibles. Mirrors the UI shown in the slide.
 * ───────────────────────────────────────────────────────────────────────── */
router.get("/quests/progress", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;

  const [quests, progressRows, walletRows, collectibles, multiplier] = await Promise.all([
    db.select().from(questsTable).where(eq(questsTable.active, true)).orderBy(asc(questsTable.sortOrder)),
    db.select().from(userQuestProgressTable).where(eq(userQuestProgressTable.userId, userId)),
    db.select().from(kultroinWalletsTable).where(eq(kultroinWalletsTable.userId, userId)).limit(1),
    db.select().from(collectibleInventoryTable).where(eq(collectibleInventoryTable.userId, userId)).orderBy(desc(collectibleInventoryTable.earnedAt)),
    db.transaction((tx) => getMultiplier(tx, userId)),
  ]);

  const progressByQuest = new Map(progressRows.map((p) => [p.questId, p]));

  const questViews = quests.map((q) => {
    const p = progressByQuest.get(q.id);
    const current = p?.progress ?? 0;
    return {
      id: q.id,
      slug: q.slug,
      name: q.name,
      description: q.description,
      target: q.targetCount,
      progress: current,
      completed: p?.completed ?? false,
      completedAt: p?.completedAt ?? null,
      points: q.pointsReward,
      collectibleName: q.collectibleName,
      collectibleRarity: q.collectibleRarity,
      badgeImageKey: q.badgeImageKey,
      percent: q.targetCount > 0 ? Math.min(100, Math.round((current / q.targetCount) * 100)) : 0,
    };
  });

  const completedCount = questViews.filter((q) => q.completed).length;

  res.json({
    balance: walletRows[0]?.balance ?? 0,
    lifetimeEarned: walletRows[0]?.lifetimeEarned ?? 0,
    pass: { active: multiplier > 1, multiplier },
    quests: questViews,
    overall: {
      total: questViews.length,
      completed: completedCount,
      percent: questViews.length > 0 ? Math.round((completedCount / questViews.length) * 100) : 0,
      allCompleted: questViews.length > 0 && completedCount === questViews.length,
    },
    collectibles: collectibles.map((c) => ({
      slug: c.slug,
      name: c.name,
      rarity: c.rarity,
      imageKey: c.imageKey,
      earnedAt: c.earnedAt,
    })),
  });
});

/* ── POST /check-in/verify ────────────────────────────────────────────────
 * Verify event attendance and advance quests. Anti-cheat: the user must hold a
 * confirmed ticket for the event, and quests only advance when the event's
 * category/tags actually match the quest rule. Atomic and idempotent per
 * (user, event) via the eventCheckins unique constraint.
 * ───────────────────────────────────────────────────────────────────────── */
router.post("/check-in/verify", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const { eventId, ticketId } = req.body as { eventId?: string; ticketId?: string };

  if (!eventId) {
    res.status(400).json({ message: "eventId is required" });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
  if (!event) {
    res.status(404).json({ message: "Event not found" });
    return;
  }

  // Anti-cheat: a confirmed ticket for this user + event is required to check in.
  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.userId, userId),
        eq(ticketsTable.eventId, eventId),
        eq(ticketsTable.status, "confirmed"),
      ),
    )
    .orderBy(asc(ticketsTable.purchasedAt))
    .limit(1);

  if (!ticket) {
    res.status(403).json({ message: "A confirmed ticket is required to check in to this event." });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Atomic guard: only the first concurrent check-in inserts a row.
      const inserted = await tx
        .insert(eventCheckinsTable)
        .values({ userId, eventId, ticketId: ticketId ?? ticket.id, source: "qr" })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) {
        return { alreadyCheckedIn: true as const };
      }

      const summary = await processCheckin(
        tx,
        userId,
        { id: event.id, category: event.category, eventDate: event.eventDate, tags: event.tags },
        { id: ticket.id, purchasedAt: ticket.purchasedAt },
      );
      return { alreadyCheckedIn: false as const, summary };
    });

    if (result.alreadyCheckedIn) {
      res.status(200).json({ alreadyCheckedIn: true, pointsEarned: 0, questsCompleted: [], collectiblesGranted: [] });
      return;
    }
    res.status(201).json({ alreadyCheckedIn: false, ...result.summary });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      res.status(402).json({ message: err.message });
      return;
    }
    throw err;
  }
});

/* ── GET /perks ───────────────────────────────────────────────────────────
 * Redeemable perks catalog.
 * ───────────────────────────────────────────────────────────────────────── */
router.get("/perks", requireAuth, async (_req: Request, res: Response) => {
  const perks = await db.select().from(perksTable).where(eq(perksTable.active, true)).orderBy(asc(perksTable.cost));
  res.json({ perks });
});

/* ── POST /perks/unlock ───────────────────────────────────────────────────
 * Spend KULTROINS to unlock an experience. Atomic: the wallet row is locked
 * FOR UPDATE inside award(), so two simultaneous unlocks can never overdraw.
 * ───────────────────────────────────────────────────────────────────────── */
router.post("/perks/unlock", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const { perkSlug } = req.body as { perkSlug?: string };

  if (!perkSlug) {
    res.status(400).json({ message: "perkSlug is required" });
    return;
  }

  const [perk] = await db.select().from(perksTable).where(eq(perksTable.slug, perkSlug)).limit(1);
  if (!perk || !perk.active) {
    res.status(404).json({ message: "Perk not found" });
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      if (!perk.repeatable) {
        const [existing] = await tx
          .select({ id: userPerkUnlocksTable.id })
          .from(userPerkUnlocksTable)
          .where(and(eq(userPerkUnlocksTable.userId, userId), eq(userPerkUnlocksTable.perkId, perk.id)))
          .limit(1);
        if (existing) return { already: true as const };
      }

      // Idempotency key: stable for one-time perks, unique per redemption for repeatable.
      const idempotencyKey = perk.repeatable
        ? `perk:${userId}:${perk.id}:${Date.now()}`
        : `perk:${userId}:${perk.id}`;

      const res2 = await award(tx, {
        userId,
        delta: -perk.cost,
        reason: "perk_redemption",
        idempotencyKey,
        referenceType: "perk",
        referenceId: perk.id,
      });

      await tx.insert(userPerkUnlocksTable).values({ userId, perkId: perk.id, cost: perk.cost });
      return { already: false as const, balanceAfter: res2.balanceAfter };
    });

    if (result.already) {
      res.status(409).json({ message: "Perk already unlocked" });
      return;
    }
    res.status(201).json({ unlocked: true, perk: { slug: perk.slug, name: perk.name }, balanceAfter: result.balanceAfter });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      res.status(402).json({ message: "Not enough KULTROINS to unlock this perk.", balance: err.balance, required: err.required });
      return;
    }
    throw err;
  }
});

/* ── GET /profile ────────────────────────────────────────────────────────
 * Level, XP, streak calendar, and derived badge eligibility for the signed-in
 * user — all computed from existing tables with no schema changes.
 *
 * Level formula: floor(lifetimeEarned / 200) + 1
 * Streak: consecutive UTC days with at least one verified check-in
 * Badges: rule-based from check-in count + streak
 * ───────────────────────────────────────────────────────────────────────── */
router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;

  const [walletRows, checkinRows, collectibles, progressRows] = await Promise.all([
    db
      .select({ balance: kultroinWalletsTable.balance, lifetimeEarned: kultroinWalletsTable.lifetimeEarned })
      .from(kultroinWalletsTable)
      .where(eq(kultroinWalletsTable.userId, userId))
      .limit(1),
    db
      .select({ createdAt: eventCheckinsTable.createdAt })
      .from(eventCheckinsTable)
      .where(eq(eventCheckinsTable.userId, userId))
      .orderBy(desc(eventCheckinsTable.createdAt)),
    db
      .select({ slug: collectibleInventoryTable.slug, name: collectibleInventoryTable.name, rarity: collectibleInventoryTable.rarity, imageKey: collectibleInventoryTable.imageKey })
      .from(collectibleInventoryTable)
      .where(eq(collectibleInventoryTable.userId, userId)),
    db
      .select({ completed: userQuestProgressTable.completed })
      .from(userQuestProgressTable)
      .where(and(eq(userQuestProgressTable.userId, userId), eq(userQuestProgressTable.completed, true))),
  ]);

  const lifetimeEarned = walletRows[0]?.lifetimeEarned ?? 0;
  const balance = walletRows[0]?.balance ?? 0;
  const XP_PER_LEVEL = 200;
  const level = Math.floor(lifetimeEarned / XP_PER_LEVEL) + 1;
  const xp = lifetimeEarned % XP_PER_LEVEL;

  // Unique UTC date strings (YYYY-MM-DD) for every day with a check-in.
  const dateSet = new Set<string>();
  for (const { createdAt } of checkinRows) {
    dateSet.add(createdAt.toISOString().slice(0, 10));
  }
  const uniqueDates = [...dateSet].sort().reverse(); // newest first

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  // Current streak: consecutive days ending today or yesterday.
  let currentStreak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) break;
      currentStreak = 1;
    } else {
      const prev = new Date(uniqueDates[i - 1] + "T12:00:00Z");
      const curr = new Date(uniqueDates[i] + "T12:00:00Z");
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
      if (diffDays === 1) currentStreak++;
      else break;
    }
  }

  // Best streak: maximum consecutive-day run across all history.
  let bestStreak = currentStreak;
  let run = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) { run = 1; continue; }
    const prev = new Date(uniqueDates[i - 1] + "T12:00:00Z");
    const curr = new Date(uniqueDates[i] + "T12:00:00Z");
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    run = diffDays === 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  }

  const totalCheckins = checkinRows.length;
  const questsCompleted = progressRows.length;

  const badges = [
    { id: "week_warrior", name: "Week Warrior", description: "7-Day Streak", earned: currentStreak >= 7 },
    { id: "consistent", name: "Consistent", description: "3 Events in a Row", earned: totalCheckins >= 3 },
    { id: "event_king", name: "Event King", description: "10+ Events", earned: totalCheckins >= 10 },
    { id: "community_builder", name: "Community Builder", description: "5 Events Attended", earned: totalCheckins >= 5 },
  ];

  // Last 7 calendar days (oldest → newest) for the streak heatmap.
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    return { date: d, checked: dateSet.has(d) };
  });

  res.json({
    level,
    xp,
    xpToNextLevel: XP_PER_LEVEL,
    lifetimeEarned,
    balance,
    totalCheckins,
    questsCompleted,
    currentStreak,
    bestStreak,
    last7Days,
    badges,
    collectibles,
  });
});

/* ── GET /wallet/ledger ───────────────────────────────────────────────────
 * Verifiable, hash-chained ledger history for the signed-in user.
 * ───────────────────────────────────────────────────────────────────────── */
router.get("/wallet/ledger", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const entries = await db
    .select()
    .from(kultroinLedgerTable)
    .where(eq(kultroinLedgerTable.userId, userId))
    .orderBy(desc(kultroinLedgerTable.seq))
    .limit(100);
  res.json({ entries });
});

/* ── POST /pass/activate ──────────────────────────────────────────────────
 * Grant / refresh the KULTR PASS entitlement. Stub for billing: until recurring
 * payments are wired, this simply flags the entitlement at the fixed default
 * multiplier — never a client-supplied one, which would let any user set an
 * arbitrary earn-rate on the KULTROIN ledger for free.
 * ───────────────────────────────────────────────────────────────────────── */
const KULTR_PASS_MULTIPLIER = "1.50";

router.post("/pass/activate", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;

  const [sub] = await db
    .insert(kultrPassSubscriptionsTable)
    .values({ userId, multiplier: KULTR_PASS_MULTIPLIER, active: true })
    .onConflictDoUpdate({
      target: kultrPassSubscriptionsTable.userId,
      set: { active: true, multiplier: KULTR_PASS_MULTIPLIER, startedAt: new Date() },
    })
    .returning();

  res.status(201).json({ active: sub.active, multiplier: Number(sub.multiplier), tier: sub.tier });
});

export default router;
