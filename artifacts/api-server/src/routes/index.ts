import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import withdrawalsRouter from "./withdrawals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(withdrawalsRouter);

export default router;
