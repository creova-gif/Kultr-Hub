import { Router } from "express";
import { and, eq, ne, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  ticketsTable,
  eventsTable,
  ticketTypesTable,
  kultroinWalletsTable,
  kultroinLedgerTable,
  userQuestProgressTable,
  eventCheckinsTable,
  collectibleInventoryTable,
  kultrPassSubscriptionsTable,
  userPerkUnlocksTable,
} from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/users/me/export
 * Data-subject access: returns a machine-readable copy of everything we hold
 * about the signed-in user. Required by Kenya DPA 2019, Nigeria NDPR and POPIA.
 * The password hash and other server-only secrets are deliberately excluded.
 */
router.get("/me/export", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const [
    tickets,
    eventsCreated,
    wallet,
    ledger,
    questProgress,
    checkins,
    collectibles,
    pass,
    perkUnlocks,
  ] = await Promise.all([
    db.select().from(ticketsTable).where(eq(ticketsTable.userId, userId)),
    db.select().from(eventsTable).where(eq(eventsTable.creatorId, userId)),
    db.select().from(kultroinWalletsTable).where(eq(kultroinWalletsTable.userId, userId)),
    db.select().from(kultroinLedgerTable).where(eq(kultroinLedgerTable.userId, userId)),
    db.select().from(userQuestProgressTable).where(eq(userQuestProgressTable.userId, userId)),
    db.select().from(eventCheckinsTable).where(eq(eventCheckinsTable.userId, userId)),
    db.select().from(collectibleInventoryTable).where(eq(collectibleInventoryTable.userId, userId)),
    db.select().from(kultrPassSubscriptionsTable).where(eq(kultrPassSubscriptionsTable.userId, userId)),
    db.select().from(userPerkUnlocksTable).where(eq(userPerkUnlocksTable.userId, userId)),
  ]);

  // Exclude server-only secrets from the export.
  const { passwordHash: _passwordHash, ...profile } = user;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="kultr-hub-my-data.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    profile,
    tickets,
    eventsCreated,
    rewards: {
      wallet: wallet[0] ?? null,
      ledger,
      questProgress,
      checkins,
      collectibles,
      kultrPass: pass[0] ?? null,
      perkUnlocks,
    },
  });
});

class AttendeesExistError extends Error {}

/**
 * DELETE /api/users/me
 * Right to erasure. Removes the account and all rows that reference it
 * (tickets, gamification state, etc. cascade at the DB level).
 *
 * Guard: if the user is an event creator whose events hold confirmed tickets
 * bought by *other* people, deletion would cascade-delete those buyers' tickets.
 * We refuse in that case so attendees are never silently stripped of a ticket
 * they paid for — the creator must transfer or wind down those events first.
 *
 * The guard and the delete run in one transaction, with the creator's
 * ticket_types row-locked (SELECT ... FOR UPDATE) for its duration. issueTicket()
 * takes a conflicting lock on that same row via its guarded UPDATE — so a
 * purchase racing this deletion serializes against it instead of landing in
 * the gap between an unguarded check and an unguarded delete.
 */
router.delete("/me", requireAuth, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;

  try {
    const deleted = await db.transaction(async (tx) => {
      const ownedEvents = await tx
        .select({ id: eventsTable.id })
        .from(eventsTable)
        .where(eq(eventsTable.creatorId, userId));

      if (ownedEvents.length > 0) {
        const eventIds = ownedEvents.map((e) => e.id);

        // Lock every ticket_types row for these events before re-checking —
        // this is the same row a concurrent issueTicket() call must update to
        // complete a purchase, so that call now blocks until this transaction
        // commits or rolls back instead of racing it.
        await tx
          .select({ id: ticketTypesTable.id })
          .from(ticketTypesTable)
          .where(inArray(ticketTypesTable.eventId, eventIds))
          .for("update");

        const [othersTicket] = await tx
          .select({ id: ticketsTable.id })
          .from(ticketsTable)
          .where(
            and(
              inArray(ticketsTable.eventId, eventIds),
              ne(ticketsTable.userId, userId),
              eq(ticketsTable.status, "confirmed"),
            ),
          )
          .limit(1);

        if (othersTicket) throw new AttendeesExistError();
      }

      return tx.delete(usersTable).where(eq(usersTable.id, userId)).returning({ id: usersTable.id });
    });

    if (deleted.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    if (err instanceof AttendeesExistError) {
      res.status(409).json({
        message:
          "Your events have tickets held by other attendees. Cancel or transfer those events before deleting your account, or contact support.",
        code: "events_have_attendees",
      });
      return;
    }
    throw err;
  }
});

export default router;
