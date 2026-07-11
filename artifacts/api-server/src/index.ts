import "./instrument";
import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Without this, a rolling deploy/restart (SIGTERM) kills in-flight requests
// immediately and leaves the Postgres pool's connections dangling instead of
// releasing them back to the database.
function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(async (err) => {
    if (err) logger.error({ err }, "Error closing HTTP server");
    try {
      await pool.end();
    } catch (poolErr) {
      logger.error({ err: poolErr }, "Error closing DB pool");
    }
    process.exit(err ? 1 : 0);
  });
  // Force-exit if connections haven't drained in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
