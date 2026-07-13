# Kultr Hub

Events and ticketing platform for East African markets (Kenya, Uganda, Tanzania, Rwanda) — a React Native/Expo mobile app backed by an Express API and Postgres, with mobile-money and card payments, creator tools, and admin moderation.

## Run & Operate

- `PORT=<port> pnpm --filter @workspace/api-server run dev` — build + run the API server. `PORT` is required — the server refuses to start without it (`artifacts/api-server/src/index.ts`).
- `pnpm --filter @workspace/kultr-mobile run dev` — run the Expo dev server (mobile web/native)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (`lib/api-spec/openapi.yaml`) after changing it
- `pnpm --filter db run migrate` — apply versioned migrations. **Use this, not `push`**, anywhere beyond throwaway local experimentation — `scripts/post-merge.sh` runs this on every pull for exactly that reason; an earlier version of that hook ran `push` instead and silently drifted schema state.
- `pnpm --filter db run generate` — generate a new migration file after a schema change, before running `migrate`
- Required env: `DATABASE_URL`, `JWT_SECRET`, `PORT`. See `.env.example` for the full list (payment/SMS provider keys, Redis, Sentry, CORS) — all optional in development, since every provider runs in a simulated mode when unconfigured, gated off outside development by `NODE_ENV=production` (`lib/simulation.ts`).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (Expo Router), React Native, React Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (versioned migrations, not `db push`, in any shared environment)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → `lib/api-client-react` (hooks) + `lib/api-zod` (schemas)
- Build: esbuild (API server, CJS bundle)
- Payments: Paystack (card), M-Pesa Daraja (STK Push), MTN MoMo (Request-to-Pay)
- Rate limiting: Redis-backed (`REDIS_URL`), falls back to in-process memory per-instance if unset
- Error monitoring: Sentry, no-ops without a DSN

## Where things live

- `artifacts/api-server/src/routes/` — one file per resource (events, payments, payouts, gamification, notifications, reports, auth, tickets, users, fx, health)
- `artifacts/kultr-mobile/app/` — Expo Router file-based routes; `(tabs)/` is the bottom-nav tab group
- `lib/db/src/schema/` — Drizzle table definitions, source of truth for the DB shape
- `lib/api-spec/openapi.yaml` — source of truth for the API contract; regenerate hooks/schemas after editing
- `lib/db/migrations/` — versioned migrations, in order; `meta/_journal.json` must stay consistent with the files present

## Architecture decisions

- Payment amounts are always recomputed server-side from the DB ticket price and verified against the provider — never trusted from client input.
- Simulated payment/SMS mode is a server-side decision gated by both "not production" AND "provider unconfigured" (`lib/simulation.ts`) — never derived from a client flag.
- Money-adjacent writes (ticket issuance, KULTROIN awards, payout creation/resolution) use a DB transaction with either a guarded atomic UPDATE (`WHERE` clause encoding the invariant) or a Postgres advisory lock, not a separate read-then-write.
- Non-admin creators can submit an event for review but never move it directly to live — only an admin can approve. Admins can force any status transition at any time (the moderation kill-switch).
- Real notifications are additive and best-effort: always wrapped in `try/catch` after the primary operation's transaction has committed, never allowed to fail the operation itself.

## Gotchas

- Always run `pnpm --filter db run migrate` after pulling, never `push`, outside of solo local experimentation.
- The mobile web build's `Alert.alert` is a no-op on `react-native-web` — use `@/lib/alert` (a themed modal replacement), not `react-native`'s `Alert`, in any mobile app code.
- `Linking.getInitialURL()` on web returns the current page URL, not just a genuine external-launch link — any deep-link handling in `app/_layout.tsx` must be gated to native-only or it can create a navigation loop on direct page loads.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
