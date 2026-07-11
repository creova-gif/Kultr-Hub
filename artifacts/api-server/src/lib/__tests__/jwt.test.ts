import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jwtModule = path.join(__dirname, "../jwt.ts");

// jwt.ts resolves its signing secret once, at module-load time — the only
// reliable way to test that behavior under different env vars is a fresh
// process per case, not re-importing the module (ESM caches the instance).
function importInChildProcess(env: NodeJS.ProcessEnv): { ok: boolean; stderr: string } {
  try {
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", `import ${JSON.stringify(jwtModule)};`],
      { env: { ...process.env, ...env }, stdio: ["ignore", "ignore", "pipe"] },
    );
    return { ok: true, stderr: "" };
  } catch (err) {
    const e = err as { stderr?: Buffer };
    return { ok: false, stderr: e.stderr?.toString() ?? "" };
  }
}

test("jwt: refuses to boot in production with no JWT_SECRET set", () => {
  const result = importInChildProcess({ NODE_ENV: "production", JWT_SECRET: "" });
  assert.equal(result.ok, false, "module import should throw");
  assert.match(result.stderr, /JWT_SECRET must be set/);
});

test("jwt: refuses to boot in production with a short JWT_SECRET", () => {
  const result = importInChildProcess({ NODE_ENV: "production", JWT_SECRET: "too-short" });
  assert.equal(result.ok, false, "module import should throw");
  assert.match(result.stderr, /JWT_SECRET must be set/);
});

test("jwt: boots in production with a valid 32+ char JWT_SECRET", () => {
  const result = importInChildProcess({
    NODE_ENV: "production",
    JWT_SECRET: "a".repeat(32),
  });
  assert.equal(result.ok, true, `expected clean boot, got: ${result.stderr}`);
});

test("jwt: boots in development with no JWT_SECRET (ephemeral dev secret)", () => {
  const result = importInChildProcess({ NODE_ENV: "development", JWT_SECRET: "" });
  assert.equal(result.ok, true, `expected clean boot, got: ${result.stderr}`);
});

test("jwt: sign/verify round-trip works and rejects tokens signed with a different secret", async () => {
  const { signToken, verifyToken } = await import("../jwt.js");
  const token = signToken({ userId: "u1", email: "u1@example.com", tokenVersion: 0 });
  const payload = verifyToken(token);
  assert.equal(payload.userId, "u1");
  assert.equal(payload.email, "u1@example.com");
  assert.equal(payload.tokenVersion, 0);

  const jwt = (await import("jsonwebtoken")).default;
  const forged = jwt.sign({ userId: "attacker", email: "a@a.com" }, "wrong-secret", {
    algorithm: "HS256",
  });
  assert.throws(() => verifyToken(forged));
});

test("jwt: rejects a token signed with a different algorithm (alg confusion)", async () => {
  const { verifyToken } = await import("../jwt.js");
  const jwt = (await import("jsonwebtoken")).default;
  // none-algorithm / mismatched-algorithm tokens must not verify even if the
  // payload looks legitimate.
  const forged = jwt.sign({ userId: "u1", email: "u1@example.com" }, "irrelevant", {
    algorithm: "HS384",
  });
  assert.throws(() => verifyToken(forged));
});
