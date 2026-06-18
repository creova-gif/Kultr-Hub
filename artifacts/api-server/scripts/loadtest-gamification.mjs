#!/usr/bin/env node
/**
 * Brute-force atomicity test for the KULTROIN ledger.
 *
 * Fires many CONCURRENT requests at the live API to prove two invariants the
 * design promises:
 *   1. Double-credit:  N simultaneous check-ins for the SAME (user, event)
 *      credit points exactly ONCE (eventCheckins unique constraint + the
 *      FOR UPDATE wallet lock inside award()).
 *   2. Overdraft:      N simultaneous perk unlocks never drive the balance
 *      below zero and never grant more perks than the balance can pay for.
 *
 * This needs a RUNNING server + Postgres. It cannot be executed in a sandbox
 * with no live DB. Usage:
 *
 *   API_URL=http://localhost:3001 \
 *   TOKEN=<jwt for a user holding a confirmed ticket to EVENT_ID> \
 *   EVENT_ID=<uuid> \
 *   PERK_SLUG=backstage-digital-content \
 *   CONCURRENCY=1000 \
 *   node scripts/loadtest-gamification.mjs
 */

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const TOKEN = process.env.TOKEN;
const EVENT_ID = process.env.EVENT_ID;
const PERK_SLUG = process.env.PERK_SLUG ?? "backstage-digital-content";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? "1000");

if (!TOKEN || !EVENT_ID) {
  console.error("Set TOKEN and EVENT_ID env vars. See header for usage.");
  process.exit(1);
}

const headers = { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` };

async function getProgress() {
  const res = await fetch(`${API_URL}/api/quests/progress`, { headers });
  if (!res.ok) throw new Error(`progress ${res.status}`);
  return res.json();
}

function fireAll(n, fn) {
  return Promise.allSettled(Array.from({ length: n }, (_, i) => fn(i)));
}

async function testDoubleCredit() {
  console.log(`\n[1] Double-credit: ${CONCURRENCY} concurrent check-ins for one (user, event)`);
  const before = await getProgress();

  const results = await fireAll(CONCURRENCY, () =>
    fetch(`${API_URL}/api/check-in/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId: EVENT_ID }),
    }).then((r) => r.status),
  );

  const statuses = results.map((r) => (r.status === "fulfilled" ? r.value : "ERR"));
  const created = statuses.filter((s) => s === 201).length;
  const duplicate = statuses.filter((s) => s === 200).length;
  const after = await getProgress();

  console.log(`    HTTP 201 (credited): ${created}  |  HTTP 200 (already): ${duplicate}`);
  console.log(`    balance before: ${before.balance}  after: ${after.balance}`);

  const pass = created === 1 && duplicate === CONCURRENCY - 1;
  console.log(pass ? "    ✅ PASS — credited exactly once" : "    ❌ FAIL — duplicate credits detected");
  return pass;
}

async function testOverdraft() {
  console.log(`\n[2] Overdraft: ${CONCURRENCY} concurrent unlocks of "${PERK_SLUG}"`);
  const before = await getProgress();
  const perksRes = await fetch(`${API_URL}/api/perks`, { headers }).then((r) => r.json());
  const perk = perksRes.perks.find((p) => p.slug === PERK_SLUG);
  if (!perk) {
    console.log(`    ⚠️  perk "${PERK_SLUG}" not found; skipping`);
    return true;
  }

  const expectedMax = Math.floor(before.balance / perk.cost);
  const results = await fireAll(CONCURRENCY, () =>
    fetch(`${API_URL}/api/perks/unlock`, {
      method: "POST",
      headers,
      body: JSON.stringify({ perkSlug: PERK_SLUG }),
    }).then((r) => r.status),
  );

  const statuses = results.map((r) => (r.status === "fulfilled" ? r.value : "ERR"));
  const unlocked = statuses.filter((s) => s === 201).length;
  const denied = statuses.filter((s) => s === 402 || s === 409).length;
  const after = await getProgress();

  console.log(`    unlocked: ${unlocked}  denied: ${denied}  (cost ${perk.cost}, expected max ${expectedMax})`);
  console.log(`    balance before: ${before.balance}  after: ${after.balance}`);

  const pass = after.balance >= 0 && unlocked <= expectedMax;
  console.log(pass ? "    ✅ PASS — no overdraft" : "    ❌ FAIL — balance went negative or over-granted");
  return pass;
}

(async () => {
  console.log(`Target: ${API_URL}  | concurrency: ${CONCURRENCY}`);
  const a = await testDoubleCredit();
  const b = await testOverdraft();
  console.log(`\nResult: ${a && b ? "✅ ALL PASS" : "❌ FAILURES PRESENT"}`);
  process.exit(a && b ? 0 : 1);
})();
