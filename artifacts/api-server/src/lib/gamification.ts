import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  kultroinLedgerTable,
  kultroinWalletsTable,
  kultrPassSubscriptionsTable,
  collectibleInventoryTable,
  questsTable,
  userQuestProgressTable,
  type Quest,
} from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Thrown when a spend would drive a wallet balance negative. */
export class InsufficientFundsError extends Error {
  constructor(public balance: number, public required: number) {
    super(`Insufficient KULTROINS: balance ${balance}, required ${required}`);
    this.name = "InsufficientFundsError";
  }
}

type LedgerReason =
  | "quest_completion"
  | "milestone_bonus"
  | "perk_redemption"
  | "manual_adjust"
  | "signup_bonus";

interface AwardInput {
  userId: string;
  delta: number; // positive = earn, negative = spend
  reason: LedgerReason;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
}

interface AwardResult {
  applied: boolean; // false when the idempotencyKey was already recorded
  balanceAfter: number;
}

function hashEntry(parts: {
  prevHash: string;
  userId: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  idempotencyKey: string;
}): string {
  return createHash("sha256")
    .update(
      [
        parts.prevHash,
        parts.userId,
        String(parts.delta),
        String(parts.balanceAfter),
        parts.reason,
        parts.idempotencyKey,
      ].join("|"),
    )
    .digest("hex");
}

/**
 * Atomically mutate a user's KULTROIN balance and append a chained ledger
 * entry. MUST be called inside a db.transaction. Locks the wallet row
 * FOR UPDATE so concurrent writes for the same user serialize — this is what
 * makes double-credits and overdrafts impossible without Redis.
 *
 * Idempotent on `idempotencyKey`: replaying the same award is a no-op.
 */
export async function award(tx: Tx, input: AwardInput): Promise<AwardResult> {
  // Ensure a wallet row exists, then take a row lock.
  await tx
    .insert(kultroinWalletsTable)
    .values({ userId: input.userId, balance: 0 })
    .onConflictDoNothing();

  const [wallet] = await tx
    .select()
    .from(kultroinWalletsTable)
    .where(eq(kultroinWalletsTable.userId, input.userId))
    .for("update");

  // Idempotency: if this key already produced a ledger entry, do nothing.
  const [existing] = await tx
    .select({ id: kultroinLedgerTable.id })
    .from(kultroinLedgerTable)
    .where(eq(kultroinLedgerTable.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (existing) {
    return { applied: false, balanceAfter: wallet.balance };
  }

  const balanceAfter = wallet.balance + input.delta;
  if (balanceAfter < 0) {
    throw new InsufficientFundsError(wallet.balance, -input.delta);
  }

  // Per-user hash chain for tamper-evidence.
  const [last] = await tx
    .select({ txHash: kultroinLedgerTable.txHash })
    .from(kultroinLedgerTable)
    .where(eq(kultroinLedgerTable.userId, input.userId))
    .orderBy(desc(kultroinLedgerTable.seq))
    .limit(1);

  const prevHash = last?.txHash ?? "genesis";
  const txHash = hashEntry({
    prevHash,
    userId: input.userId,
    delta: input.delta,
    balanceAfter,
    reason: input.reason,
    idempotencyKey: input.idempotencyKey,
  });

  await tx.insert(kultroinLedgerTable).values({
    userId: input.userId,
    delta: input.delta,
    reason: input.reason,
    balanceAfter,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    idempotencyKey: input.idempotencyKey,
    prevHash,
    txHash,
  });

  await tx
    .update(kultroinWalletsTable)
    .set({
      balance: balanceAfter,
      lifetimeEarned: sql`${kultroinWalletsTable.lifetimeEarned} + ${input.delta > 0 ? input.delta : 0}`,
      lifetimeSpent: sql`${kultroinWalletsTable.lifetimeSpent} + ${input.delta < 0 ? -input.delta : 0}`,
      updatedAt: new Date(),
    })
    .where(eq(kultroinWalletsTable.userId, input.userId));

  return { applied: true, balanceAfter };
}

/** Active KULTR PASS multiplier (1.0 when no active pass). */
export async function getMultiplier(tx: Tx, userId: string): Promise<number> {
  const [sub] = await tx
    .select()
    .from(kultrPassSubscriptionsTable)
    .where(eq(kultrPassSubscriptionsTable.userId, userId))
    .limit(1);

  if (!sub || !sub.active) return 1;
  if (sub.expiresAt && sub.expiresAt.getTime() < Date.now()) return 1;
  return Number(sub.multiplier) || 1;
}

interface CheckinEvent {
  id: string;
  category: string;
  eventDate: Date;
  tags: string[] | null;
}

interface CheckinTicket {
  id: string;
  purchasedAt: Date;
}

/** Does a verified check-in on `event` count toward `quest`? */
function questMatchesEvent(quest: Quest, event: CheckinEvent, ticket: CheckinTicket | null): boolean {
  switch (quest.matchRule) {
    case "any":
      return true;
    case "category":
      return quest.requiredCategory === event.category;
    case "tag":
      return !!quest.requiredTag && (event.tags ?? []).includes(quest.requiredTag);
    case "early_bird": {
      if (!ticket) return false;
      const cutoff = event.eventDate.getTime() - quest.earlyBirdDays * 86_400_000;
      return ticket.purchasedAt.getTime() <= cutoff;
    }
    default:
      return false;
  }
}

export interface CheckinSummary {
  pointsEarned: number;
  questsCompleted: { slug: string; name: string; points: number }[];
  collectiblesGranted: { slug: string; name: string; rarity: string }[];
  allCompleted: boolean;
  legendAwarded: boolean;
}

const MILESTONE_BONUS = 500;
const LEGEND_COLLECTIBLE = {
  slug: "kultr-legend",
  name: "Kultr Legend",
  rarity: "legendary" as const,
  imageKey: "legend",
};

/**
 * Apply a single verified check-in: advance every matching quest, award points
 * (with KULTR PASS multiplier) and collectibles for newly-completed quests, and
 * grant the "Kultr Legend" milestone when all active quests are complete.
 *
 * MUST run inside a db.transaction. Relies on the eventCheckins unique
 * constraint (enforced by the caller) so this body runs at most once per
 * (user, event).
 */
export async function processCheckin(
  tx: Tx,
  userId: string,
  event: CheckinEvent,
  ticket: CheckinTicket | null,
): Promise<CheckinSummary> {
  const multiplier = await getMultiplier(tx, userId);
  const quests = await tx.select().from(questsTable).where(eq(questsTable.active, true));

  const summary: CheckinSummary = {
    pointsEarned: 0,
    questsCompleted: [],
    collectiblesGranted: [],
    allCompleted: false,
    legendAwarded: false,
  };

  for (const quest of quests) {
    if (!questMatchesEvent(quest, event, ticket)) continue;

    // Upsert progress + 1 (capped at target), only while not yet completed.
    const [progress] = await tx
      .insert(userQuestProgressTable)
      .values({ userId, questId: quest.id, progress: 1 })
      .onConflictDoUpdate({
        target: [userQuestProgressTable.userId, userQuestProgressTable.questId],
        set: {
          progress: sql`LEAST(${userQuestProgressTable.progress} + 1, ${quest.targetCount})`,
          updatedAt: new Date(),
        },
        setWhere: eq(userQuestProgressTable.completed, false),
      })
      .returning();

    if (!progress || progress.completed) continue;

    if (progress.progress >= quest.targetCount) {
      await tx
        .update(userQuestProgressTable)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(userQuestProgressTable.id, progress.id));

      const points = Math.floor(quest.pointsReward * multiplier);
      const res = await award(tx, {
        userId,
        delta: points,
        reason: "quest_completion",
        idempotencyKey: `quest:${userId}:${quest.id}`,
        referenceType: "quest",
        referenceId: quest.id,
      });
      if (res.applied) {
        summary.pointsEarned += points;
        summary.questsCompleted.push({ slug: quest.slug, name: quest.name, points });
      }

      const granted = await tx
        .insert(collectibleInventoryTable)
        .values({
          userId,
          slug: quest.collectibleSlug,
          name: quest.collectibleName,
          rarity: quest.collectibleRarity,
          imageKey: quest.badgeImageKey,
          questId: quest.id,
        })
        .onConflictDoNothing()
        .returning();
      if (granted[0]) {
        summary.collectiblesGranted.push({
          slug: granted[0].slug,
          name: granted[0].name,
          rarity: granted[0].rarity,
        });
      }
    }
  }

  // Milestone: every active quest complete → Kultr Legend + bonus.
  const [{ total, done }] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where ${userQuestProgressTable.completed})::int`,
    })
    .from(questsTable)
    .leftJoin(
      userQuestProgressTable,
      and(
        eq(userQuestProgressTable.questId, questsTable.id),
        eq(userQuestProgressTable.userId, userId),
      ),
    )
    .where(eq(questsTable.active, true));

  if (total > 0 && done >= total) {
    summary.allCompleted = true;
    const bonus = await award(tx, {
      userId,
      delta: MILESTONE_BONUS,
      reason: "milestone_bonus",
      idempotencyKey: `milestone:legend:${userId}`,
      referenceType: "milestone",
      referenceId: "all_quests_completed",
    });
    if (bonus.applied) {
      summary.pointsEarned += MILESTONE_BONUS;
      summary.legendAwarded = true;
      await tx
        .insert(collectibleInventoryTable)
        .values({ userId, ...LEGEND_COLLECTIBLE })
        .onConflictDoNothing();
      summary.collectiblesGranted.push({
        slug: LEGEND_COLLECTIBLE.slug,
        name: LEGEND_COLLECTIBLE.name,
        rarity: LEGEND_COLLECTIBLE.rarity,
      });
    }
  }

  return summary;
}
