import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, projectsTable, withdrawalsTable } from "@workspace/db";
import {
  ListProjectsResponse,
  CreateProjectBody,
  CreateProjectResponse,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      startingAmount: projectsTable.startingAmount,
      createdAt: projectsTable.createdAt,
      withdrawalCount: sql<number>`count(${withdrawalsTable.id})::int`,
      withdrawalTotal: sql<string>`coalesce(sum(${withdrawalsTable.amount}), 0)`,
    })
    .from(projectsTable)
    .leftJoin(withdrawalsTable, eq(withdrawalsTable.projectId, projectsTable.id))
    .groupBy(projectsTable.id)
    .orderBy(projectsTable.createdAt);

  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    startingAmount: Number(row.startingAmount),
    finalBalance: Number(row.startingAmount) - Number(row.withdrawalTotal),
    withdrawalCount: row.withdrawalCount,
    createdAt: row.createdAt,
  }));

  res.json(ListProjectsResponse.parse(data));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      name: parsed.data.name,
      startingAmount: parsed.data.startingAmount.toString(),
    })
    .returning();

  if (!project) {
    res.status(500).json({ error: "Failed to create project" });
    return;
  }

  res.status(201).json(
    CreateProjectResponse.parse({
      id: project.id,
      name: project.name,
      startingAmount: Number(project.startingAmount),
      finalBalance: Number(project.startingAmount),
      withdrawalCount: 0,
      createdAt: project.createdAt,
    }),
  );
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.projectId, project.id))
    .orderBy(withdrawalsTable.createdAt);

  res.json(
    GetProjectResponse.parse({
      id: project.id,
      name: project.name,
      startingAmount: Number(project.startingAmount),
      createdAt: project.createdAt,
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        projectId: w.projectId,
        amount: Number(w.amount),
        url: w.url,
        createdAt: w.createdAt,
      })),
    }),
  );
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: { name?: string; startingAmount?: string } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.startingAmount !== undefined) {
    updates.startingAmount = parsed.data.startingAmount.toString();
  }

  const [project] = await db
    .update(projectsTable)
    .set(updates)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [{ total }] = await db
    .select({
      total: sql<string>`coalesce(sum(${withdrawalsTable.amount}), 0)`,
    })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.projectId, project.id));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.projectId, project.id));

  res.json(
    UpdateProjectResponse.parse({
      id: project.id,
      name: project.name,
      startingAmount: Number(project.startingAmount),
      finalBalance: Number(project.startingAmount) - Number(total),
      withdrawalCount: count,
      createdAt: project.createdAt,
    }),
  );
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
