/**
 * Integration test for token revocation — the property that logout and
 * requireAuth's tokenVersion check are actually enforced by the real HTTP
 * stack, not just by the pieces in isolation. Requires a real Postgres
 * (same DATABASE_URL convention as issue.integration.test.ts); skips
 * gracefully if none is reachable.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

let dbAvailable = false;
let server: import("node:http").Server;
let baseUrl: string;
let userId: string;

before(async () => {
  try {
    await db.execute(sql`select 1`);
    dbAvailable = true;
  } catch (err) {
    console.log(`\n[auth.integration.test] Skipping — no reachable database (${(err as Error).message}).\n`);
    return;
  }

  const { default: app } = await import("../../app.js");
  server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  const [user] = await db
    .insert(usersTable)
    .values({ email: `auth-revoke-test-${Date.now()}@example.com`, displayName: "Revoke Test" })
    .returning();
  userId = user.id;
});

after(async () => {
  if (!dbAvailable) return;
  server?.close();
  await db.delete(usersTable).where(eq(usersTable.id, userId));
});

test("requireAuth: a token minted with the user's current tokenVersion is accepted", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const { signToken } = await import("../../lib/jwt.js");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const token = signToken({ userId, email: user.email, tokenVersion: user.tokenVersion });

  const res = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
});

test("requireAuth: a token minted with a stale tokenVersion is rejected", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const { signToken } = await import("../../lib/jwt.js");
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const staleToken = signToken({ userId, email: user.email, tokenVersion: user.tokenVersion - 1 });

  const res = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${staleToken}` } });
  assert.equal(res.status, 401);
});

test("POST /auth/logout revokes the token that called it, and only that generation", async (t) => {
  if (!dbAvailable) return t.skip("no reachable database");
  const { signToken } = await import("../../lib/jwt.js");
  const [before_] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const token = signToken({ userId, email: before_.email, tokenVersion: before_.tokenVersion });

  const preLogout = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(preLogout.status, 200, "token must work before logout");

  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutRes.status, 204);

  const postLogout = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(postLogout.status, 401, "the same token must be dead immediately after logout");

  // A freshly-minted token using the new tokenVersion must work.
  const [after_] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  assert.equal(after_.tokenVersion, before_.tokenVersion + 1, "logout must increment tokenVersion exactly once");
  const newToken = signToken({ userId, email: after_.email, tokenVersion: after_.tokenVersion });
  const withNewToken = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${newToken}` } });
  assert.equal(withNewToken.status, 200);
});
