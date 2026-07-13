# Kultr Hub

**An events and ticketing platform for East African markets — discover events, buy tickets with mobile money, and manage events as a creator.**

[![Status](https://img.shields.io/badge/status-active_development-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## What this is

Kultr Hub is a consumer-facing events and ticketing app for Kenya, Uganda, Tanzania, and Rwanda, built as a React Native/Expo mobile app (iOS, Android, and web) backed by an Express API server and Postgres. Users discover events, buy tickets paid for via M-Pesa, MTN Mobile Money, or card, and creators can list events, track sales, and request payouts. It also includes a lightweight gamification layer (quests, KULTROINS, KULTR PASS) and an admin moderation flow for event review and fraud reports.

Deployed via Replit, synced from this repository's `main` branch.

---

## Core Features

- **Event discovery** — browse, search, and filter events by date/price/category, with a per-user "For You" feed
- **Ticket purchase** — M-Pesa (Safaricom), MTN Mobile Money, and card payments via Paystack, with real backend verification (no client-trusted success states)
- **Creator tools** — event creation with an admin review gate before an event goes live, real-time sales analytics, and payout requests
- **Admin moderation** — event review queue, payout resolution, and buyer-submitted fraud/abuse reports
- **Gamification** — quests, KULTROINS (an internal points wallet with a tamper-evident ledger), and KULTR PASS (a real one-time paid multiplier subscription)
- **Real notifications** — ticket confirmations, event status changes, payout resolutions, and KULTROIN awards
- **JWT auth** — email/password and phone OTP, with real server-side token revocation on logout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native, Expo (Expo Router), TypeScript |
| API server | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Drizzle ORM (versioned migrations) |
| API contract | OpenAPI spec (`lib/api-spec`) → generated React Query hooks + Zod schemas |
| Payments | Paystack (card), M-Pesa Daraja (STK Push), MTN MoMo (Request-to-Pay) |
| Rate limiting | Redis-backed (falls back to in-process memory if unconfigured) |
| Error monitoring | Sentry (API + mobile) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Deployment | Replit, synced from GitHub |
| Monorepo | pnpm workspaces |

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 18+
- **pnpm** (enforced via preinstall check)
- A local PostgreSQL instance
- Payment/SMS provider credentials are optional in development — every provider (Paystack, M-Pesa, MTN MoMo, Africa's Talking SMS) runs in a clearly-flagged simulated mode when unconfigured, **but only outside production** (`NODE_ENV=production` disables simulation regardless of configuration)

### Installation

```bash
git clone https://github.com/creova-gif/Kultr-Hub.git
cd Kultr-Hub
pnpm install
cp .env.example .env
# fill in DATABASE_URL and JWT_SECRET at minimum — see .env.example for the full list
pnpm --filter db run migrate
pnpm run build
```

Run the API server with `pnpm --filter @workspace/api-server run dev` and the mobile app with `pnpm --filter @workspace/kultr-mobile run dev` (or the equivalent Expo commands for a native build).

---

## Security Note

This repo handles real payment provider credentials (Paystack, M-Pesa, MTN MoMo) and user auth secrets. `.env` and all local secret files are git-ignored. Every payment/OTP provider's simulated-mode fallback is gated server-side by `NODE_ENV` — never trust a client-supplied flag to skip real verification.

## Contributing

This is a private, proprietary CREOVA product. External contributions are not accepted at this time.

## License

Proprietary — All Rights Reserved. See `LICENSE`.

## Credits

Built by CREOVA. Product lead: Justin Mafie.
