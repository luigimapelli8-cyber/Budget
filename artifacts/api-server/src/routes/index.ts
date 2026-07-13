import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import withdrawalsRouter from "./withdrawals";
import partnersRouter from "./partners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(withdrawalsRouter);
router.use(partnersRouter);

export default router;
