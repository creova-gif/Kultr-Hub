# Kultr Hub

**Payments infrastructure for African markets — unified integration for M-Pesa, MTN Mobile Money, and Paystack, plus FX conversion.**

[![Status](https://img.shields.io/badge/status-active_development-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## What this is

Kultr Hub is a payments abstraction layer for African markets — one integration point instead of three separate mobile-money and card-payment SDKs. It handles the fragmentation problem directly: M-Pesa (Kenya), MTN Mobile Money (multiple East/West African markets), and Paystack (card payments, primarily Nigeria/Ghana), with foreign exchange conversion built in.

This is infrastructure-layer work — likely intended to sit underneath other CREOVA products that need to move money in African markets (e.g., artist royalty payouts via `Sauti-Os`, or merchant payments via `Gopay`) rather than being a standalone consumer-facing product itself.

---

## Core Features

- **M-Pesa integration** — Kenya's dominant mobile money system
- **MTN Mobile Money integration** — multi-market East/West African mobile money
- **Paystack integration** — card and bank payment processing
- **FX conversion** — currency conversion between supported markets
- **JWT auth** — token-based authentication for API consumers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, pnpm monorepo |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Architecture | API server (`artifacts/api-server`) |

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 18+
- **pnpm** (enforced via preinstall check)
- API credentials for whichever payment providers you're integrating (M-Pesa, MTN MoMo, Paystack) — **never commit these**

### Installation

```bash
git clone https://github.com/creova-gif/Kultr-Hub.git
cd Kultr-Hub
pnpm install
cp .env.example .env
# fill in your own provider credentials in .env — this file is git-ignored
pnpm run build
```

---

## Security Note

This repo touches real payment provider credentials by design (M-Pesa, MTN MoMo, Paystack). A full credential-history check has been run — **clean, no committed secrets found** — but given the sensitivity of what this integrates with, treat any future `.env` handling here with extra care. This is the one CREOVA repo where a leaked key has direct financial consequences, not just an inconvenience.

## Roadmap / Status

Core integrations implemented for all three payment providers plus FX. CI pipeline already in place. Relationship to `Sauti-Os` and `Gopay` (which likely consume this) should be documented explicitly once confirmed.

## Contributing

This is a private, proprietary CREOVA product. External contributions are not accepted at this time.

## License

Proprietary — All Rights Reserved. See `LICENSE`.

## Credits

Built by CREOVA. Product lead: Justin Mafie.
