import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useApp } from "@/context/AppContext";

/* ── Response shapes (mirror artifacts/api-server/src/routes/gamification.ts) ── */
export interface QuestView {
  id: string;
  slug: string;
  name: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  points: number;
  collectibleName: string;
  collectibleRarity: "common" | "rare" | "epic" | "legendary";
  badgeImageKey: string | null;
  percent: number;
}

export interface CollectibleView {
  slug: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  imageKey: string | null;
  earnedAt: string;
}

export interface QuestProgress {
  balance: number;
  lifetimeEarned: number;
  pass: { active: boolean; multiplier: number };
  quests: QuestView[];
  overall: { total: number; completed: number; percent: number; allCompleted: boolean };
  collectibles: CollectibleView[];
}

export interface PerkView {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cost: number;
  repeatable: boolean;
  active: boolean;
}

export interface CheckinResult {
  alreadyCheckedIn: boolean;
  pointsEarned: number;
  questsCompleted: { slug: string; name: string; points: number }[];
  collectiblesGranted: { slug: string; name: string; rarity: string }[];
  allCompleted?: boolean;
  legendAwarded?: boolean;
}

const API_BASE =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:3001";

const PROGRESS_KEY = ["gamification", "progress"] as const;
const PERKS_KEY = ["gamification", "perks"] as const;

async function authedFetch<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

/** Full gamification state for the signed-in user. */
export function useQuestProgress() {
  const { authToken } = useApp();
  return useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: () => authedFetch<QuestProgress>("/quests/progress", authToken),
    enabled: !!authToken,
  });
}

/** Redeemable perks catalog. */
export function usePerks() {
  const { authToken } = useApp();
  return useQuery({
    queryKey: PERKS_KEY,
    queryFn: () => authedFetch<{ perks: PerkView[] }>("/perks", authToken),
    enabled: !!authToken,
  });
}

/** Verify attendance at an event; advances quests and may award points/badges. */
export function useCheckIn() {
  const { authToken } = useApp();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      authedFetch<CheckinResult>("/check-in/verify", authToken, {
        method: "POST",
        body: JSON.stringify({ eventId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRESS_KEY }),
  });
}

/** Spend KULTROINS to unlock a perk. */
export function useUnlockPerk() {
  const { authToken } = useApp();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (perkSlug: string) =>
      authedFetch<{ unlocked: boolean; balanceAfter: number }>("/perks/unlock", authToken, {
        method: "POST",
        body: JSON.stringify({ perkSlug }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRESS_KEY }),
  });
}
