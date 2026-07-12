import { useQueryClient } from "@tanstack/react-query";
import {
  useListAllEventsAdmin,
  getListAllEventsAdminQueryKey,
  useUpdateEventStatus as useUpdateEventStatusGenerated,
  useListPendingPayoutsAdmin,
  getListPendingPayoutsAdminQueryKey,
  useResolvePayout as useResolvePayoutGenerated,
  useListEventReportsAdmin,
  getListEventReportsAdminQueryKey,
  useResolveEventReport as useResolveEventReportGenerated,
  useSetOrganizerVerified as useSetOrganizerVerifiedGenerated,
  type EventSummary,
  type PayoutView,
  type AdminEventReportView,
} from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";

export type { EventSummary, PayoutView, AdminEventReportView };

interface MutationCallbacks<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
}

/**
 * Every event awaiting moderation review (admin only — server returns 403
 * otherwise). Uses the default retry behavior: on a cold load (deep link or
 * browser refresh straight into /admin) the query can fire a beat before the
 * auth token is attached, and a hard `retry: false` here turned that one
 * transient 401 into a permanently empty "Nothing pending review" queue —
 * a false negative on the one screen where that's most dangerous. The
 * sibling payouts/notifications/analytics queries already retry through the
 * same race without issue.
 */
export function useAdminReviewQueue() {
  const { authToken } = useApp();
  return useListAllEventsAdmin(
    { status: "pending_review", limit: 100 },
    { query: { queryKey: getListAllEventsAdminQueryKey({ status: "pending_review", limit: 100 }), enabled: !!authToken } },
  );
}

/** Approve (→ live) or reject (→ draft) an event under review. */
export function useSetEventStatus() {
  const qc = useQueryClient();
  const m = useUpdateEventStatusGenerated({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAllEventsAdminQueryKey({ status: "pending_review", limit: 100 }) }),
    },
  });
  return {
    isPending: m.isPending,
    mutate: (id: string, status: "live" | "draft" | "cancelled" | "ended", callbacks?: MutationCallbacks<unknown>) =>
      m.mutate({ id, data: { status } }, callbacks),
  };
}

/** Every pending payout request across all creators (admin only). */
export function useAdminPendingPayouts() {
  const { authToken } = useApp();
  return useListPendingPayoutsAdmin({
    query: { queryKey: getListPendingPayoutsAdminQueryKey(), enabled: !!authToken },
  });
}

/** Mark a pending payout paid / failed / cancelled. Does not move money itself. */
export function useResolvePayoutAdmin() {
  const qc = useQueryClient();
  const m = useResolvePayoutGenerated({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPendingPayoutsAdminQueryKey() }),
    },
  });
  return {
    isPending: m.isPending,
    mutate: (id: string, status: "paid" | "failed" | "cancelled", callbacks?: MutationCallbacks<PayoutView>) =>
      m.mutate({ id, data: { status } }, callbacks),
  };
}

/** Every buyer-submitted event report, newest first (admin only). */
export function useAdminEventReports() {
  const { authToken } = useApp();
  return useListEventReportsAdmin({
    query: { queryKey: getListEventReportsAdminQueryKey(), enabled: !!authToken },
  });
}

/** Mark a report reviewed or dismissed. */
export function useResolveEventReport() {
  const qc = useQueryClient();
  const m = useResolveEventReportGenerated({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListEventReportsAdminQueryKey() }),
    },
  });
  return {
    isPending: m.isPending,
    mutate: (id: string, status: "reviewed" | "dismissed", callbacks?: MutationCallbacks<unknown>) =>
      m.mutate({ id, data: { status } }, callbacks),
  };
}

/** Grant or revoke a creator's "Verified Organizer" badge. */
export function useSetOrganizerVerified() {
  const m = useSetOrganizerVerifiedGenerated();
  return {
    isPending: m.isPending,
    mutate: (
      userId: string,
      isVerifiedOrganizer: boolean,
      callbacks?: MutationCallbacks<unknown>,
    ) => m.mutate({ id: userId, data: { isVerifiedOrganizer } }, callbacks),
  };
}
