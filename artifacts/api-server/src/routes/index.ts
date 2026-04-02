import { Router, type IRouter } from "express";
import healthRouter from "./health";
import goalsRouter from "./goals";
import authRouter from "./auth";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(goalsRouter);
router.use(notificationsRouter);

export default router;
