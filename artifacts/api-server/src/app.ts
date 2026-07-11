import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import * as Sentry from "@sentry/node";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(helmet());

// A missing CORS_ORIGIN must never silently fall back to "*" in production —
// that would let a malicious page hosted anywhere drive authenticated
// requests against the API. Non-production keeps the permissive default so
// local dev doesn't require configuring it.
if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
  throw new Error("CORS_ORIGIN must be set to a comma-separated allowlist in production.");
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    // Auth here is entirely Bearer-token based (see middleware/auth.ts) — no
    // cookies are ever set or read, so there is nothing that needs the
    // browser to send credentials, and Access-Control-Allow-Credentials:true
    // paired with a wildcard origin is invalid per the CORS spec anyway.
  }),
);

// Global rate limit — 300 req/min per IP
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Tighter limit on auth endpoints — 20 req/min per IP
const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authLimiter);
app.use("/api", router);

// Reports uncaught route errors to Sentry (a no-op when SENTRY_DSN is unset)
// before falling through to the JSON error response below.
Sentry.setupExpressErrorHandler(app);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err }, "Unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ message: "Internal server error" });
});

export default app;
