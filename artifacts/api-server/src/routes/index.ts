import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import eventsRouter from "./events.js";
import ticketsRouter from "./tickets.js";
import paymentsRouter from "./payments.js";
import fxRouter from "./fx.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/events", eventsRouter);
router.use("/tickets", ticketsRouter);
router.use("/payments", paymentsRouter);
router.use("/fx", fxRouter);

export default router;

