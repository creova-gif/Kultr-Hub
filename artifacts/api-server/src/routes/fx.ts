import { Router } from "express";
import { getRates } from "../lib/fx.js";
import type { Request, Response } from "express";

const router = Router();

/**
 * GET /api/fx/rates?base=KES
 * Exchange rates rebased to `base` (default KES). `source` is "live" when a
 * provider feed is configured and reachable, otherwise "static".
 */
router.get("/rates", async (req: Request, res: Response) => {
  const base = typeof req.query.base === "string" ? req.query.base : "KES";
  const result = await getRates(base);
  res.json(result);
});

export default router;
