import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, ticketsTable, ticketTypesTable } from "@workspace/db";

/**
 * Shared, hardened ticket-issuance path used by every payment provider.
 *
 * Guarantees:
 *  - Idempotency: a given paymentReference issues exactly one ticket, even under
 *    concurrent replays (enforced by the UNIQUE constraint on tickets.payment_reference).
 *  - No oversell: inventory is decremented with a single guarded, atomic UPDATE that
 *    only succeeds while sold + quantity <= total; a lost race rolls the whole tx back.
 */

export const MAX_TICKETS_PER_ORDER = 10;

export class TicketIssueError extends Error {
  constructor(
    public readonly code: "sold_out" | "invalid_quantity",
    message: string,
  ) {
    super(message);
    this.name = "TicketIssueError";
  }
}

/** Coerce and validate a client-supplied quantity. Throws TicketIssueError on bad input. */
export function validateQuantity(raw: unknown): number {
  const q = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(q) || q < 1 || q > MAX_TICKETS_PER_ORDER) {
    throw new TicketIssueError(
      "invalid_quantity",
      `quantity must be a whole number between 1 and ${MAX_TICKETS_PER_ORDER}`,
    );
  }
  return q;
}

function generateTicketNumber(): string {
  return `KTR-${nanoid(8).toUpperCase()}`;
}

export interface IssueTicketParams {
  userId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  paymentReference: string;
  paymentProvider: string;
}

export interface IssueTicketResult {
  ticket: typeof ticketsTable.$inferSelect;
  deduped: boolean;
}

/**
 * Atomically issue a ticket for a verified payment.
 *
 * Order of operations matters: we insert first with ON CONFLICT DO NOTHING so the
 * UNIQUE(payment_reference) constraint is the idempotency guard. Only if a fresh row
 * was created do we decrement inventory; if inventory is exhausted we throw, which
 * rolls back the just-inserted ticket so no orphan is left behind.
 */
export async function issueTicket(params: IssueTicketParams): Promise<IssueTicketResult> {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(ticketsTable)
      .values({
        ticketNumber: generateTicketNumber(),
        userId: params.userId,
        eventId: params.eventId,
        ticketTypeId: params.ticketTypeId,
        quantity: params.quantity,
        unitPrice: String(params.unitPrice),
        totalAmount: String(params.unitPrice * params.quantity),
        currency: params.currency,
        status: "confirmed",
        paymentReference: params.paymentReference,
        paymentProvider: params.paymentProvider,
      })
      .onConflictDoNothing({ target: ticketsTable.paymentReference })
      .returning();

    // Reference already consumed — return the existing ticket, do not touch inventory.
    if (!inserted) {
      const [existing] = await tx
        .select()
        .from(ticketsTable)
        .where(eq(ticketsTable.paymentReference, params.paymentReference))
        .limit(1);
      return { ticket: existing, deduped: true };
    }

    // Guarded, atomic inventory decrement. 0 rows affected == sold out / lost the race.
    const updated = await tx
      .update(ticketTypesTable)
      .set({ soldQuantity: sql`${ticketTypesTable.soldQuantity} + ${params.quantity}` })
      .where(
        and(
          eq(ticketTypesTable.id, params.ticketTypeId),
          sql`${ticketTypesTable.soldQuantity} + ${params.quantity} <= ${ticketTypesTable.totalQuantity}`,
        ),
      )
      .returning({ id: ticketTypesTable.id });

    if (updated.length === 0) {
      // Rolls back the inserted ticket above.
      throw new TicketIssueError("sold_out", "Not enough tickets remaining");
    }

    return { ticket: inserted, deduped: false };
  });
}
