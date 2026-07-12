import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable, withdrawalsTable } from "@workspace/db";
import {
  ListWithdrawalsParams,
  ListWithdrawalsResponse,
  CreateWithdrawalParams,
  CreateWithdrawalBody,
  CreateWithdrawalResponse,
  UpdateWithdrawalParams,
  UpdateWithdrawalBody,
  UpdateWithdrawalResponse,
  DeleteWithdrawalParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:id/withdrawals", async (req, res): Promise<void> => {
  const params = ListWithdrawalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.projectId, params.data.id))
    .orderBy(withdrawalsTable.createdAt);

  res.json(
    ListWithdrawalsResponse.parse(
      withdrawals.map((w) => ({
        id: w.id,
        projectId: w.projectId,
        amount: Number(w.amount),
        url: w.url,
        createdAt: w.createdAt,
      })),
    ),
  );
});

router.post("/projects/:id/withdrawals", async (req, res): Promise<void> => {
  const params = CreateWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [withdrawal] = await db
    .insert(withdrawalsTable)
    .values({
      projectId: params.data.id,
      amount: parsed.data.amount.toString(),
      url: parsed.data.url,
    })
    .returning();

  if (!withdrawal) {
    res.status(500).json({ error: "Failed to create withdrawal" });
    return;
  }

  res.status(201).json(
    CreateWithdrawalResponse.parse({
      id: withdrawal.id,
      projectId: withdrawal.projectId,
      amount: Number(withdrawal.amount),
      url: withdrawal.url,
      createdAt: withdrawal.createdAt,
    }),
  );
});

router.patch("/withdrawals/:id", async (req, res): Promise<void> => {
  const params = UpdateWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: { amount?: string; url?: string } = {};
  if (parsed.data.amount !== undefined) updates.amount = parsed.data.amount.toString();
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;

  const [withdrawal] = await db
    .update(withdrawalsTable)
    .set(updates)
    .where(eq(withdrawalsTable.id, params.data.id))
    .returning();

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  res.json(
    UpdateWithdrawalResponse.parse({
      id: withdrawal.id,
      projectId: withdrawal.projectId,
      amount: Number(withdrawal.amount),
      url: withdrawal.url,
      createdAt: withdrawal.createdAt,
    }),
  );
});

router.delete("/withdrawals/:id", async (req, res): Promise<void> => {
  const params = DeleteWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [withdrawal] = await db
    .delete(withdrawalsTable)
    .where(eq(withdrawalsTable.id, params.data.id))
    .returning();

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
