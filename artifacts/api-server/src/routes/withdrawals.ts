import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
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
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getPartnersByIds } from "../lib/partners";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/projects/:id/withdrawals", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = ListWithdrawalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const withdrawals = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.projectId, params.data.id))
    .orderBy(withdrawalsTable.date);

  const partnersById = await getPartnersByIds(withdrawals.map((w) => w.partnerUserId));

  res.json(
    ListWithdrawalsResponse.parse(
      withdrawals.map((w) => ({
        id: w.id,
        projectId: w.projectId,
        title: w.title,
        type: w.type,
        amount: Number(w.amount),
        url: w.url,
        date: w.date,
        paymentMethod: w.paymentMethod,
        partner: w.partnerUserId ? partnersById.get(w.partnerUserId) ?? null : null,
        createdAt: w.createdAt,
      })),
    ),
  );
});

router.post("/projects/:id/withdrawals", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
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
    .where(and(eq(projectsTable.id, params.data.id), eq(projectsTable.userId, userId)));

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [withdrawal] = await db
    .insert(withdrawalsTable)
    .values({
      projectId: params.data.id,
      title: parsed.data.title,
      type: parsed.data.type ?? "withdrawal",
      amount: parsed.data.amount.toString(),
      url: parsed.data.url,
      date: parsed.data.date ?? new Date(),
      paymentMethod: parsed.data.paymentMethod ?? "cash",
      partnerUserId: parsed.data.partnerUserId ?? null,
    })
    .returning();

  if (!withdrawal) {
    res.status(500).json({ error: "Failed to create withdrawal" });
    return;
  }

  const partnersById = await getPartnersByIds([withdrawal.partnerUserId]);

  res.status(201).json(
    CreateWithdrawalResponse.parse({
      id: withdrawal.id,
      projectId: withdrawal.projectId,
      title: withdrawal.title,
      type: withdrawal.type,
      amount: Number(withdrawal.amount),
      url: withdrawal.url,
      date: withdrawal.date,
      paymentMethod: withdrawal.paymentMethod,
      partner: withdrawal.partnerUserId
        ? partnersById.get(withdrawal.partnerUserId) ?? null
        : null,
      createdAt: withdrawal.createdAt,
    }),
  );
});

router.patch("/withdrawals/:id", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
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

  const [existing] = await db
    .select({ projectId: withdrawalsTable.projectId })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const [owned] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, existing.projectId), eq(projectsTable.userId, userId)));

  if (!owned) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const updates: {
    title?: string;
    type?: string;
    amount?: string;
    url?: string;
    date?: Date;
    paymentMethod?: string;
    partnerUserId?: string | null;
  } = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.type !== undefined) updates.type = parsed.data.type;
  if (parsed.data.amount !== undefined) updates.amount = parsed.data.amount.toString();
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;
  if (parsed.data.paymentMethod !== undefined) updates.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.partnerUserId !== undefined) updates.partnerUserId = parsed.data.partnerUserId;

  const [withdrawal] = await db
    .update(withdrawalsTable)
    .set(updates)
    .where(eq(withdrawalsTable.id, params.data.id))
    .returning();

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const partnersById = await getPartnersByIds([withdrawal.partnerUserId]);

  res.json(
    UpdateWithdrawalResponse.parse({
      id: withdrawal.id,
      projectId: withdrawal.projectId,
      title: withdrawal.title,
      type: withdrawal.type,
      amount: Number(withdrawal.amount),
      url: withdrawal.url,
      date: withdrawal.date,
      paymentMethod: withdrawal.paymentMethod,
      partner: withdrawal.partnerUserId
        ? partnersById.get(withdrawal.partnerUserId) ?? null
        : null,
      createdAt: withdrawal.createdAt,
    }),
  );
});

router.delete("/withdrawals/:id", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const params = DeleteWithdrawalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [withdrawal] = await db
    .select({ projectId: withdrawalsTable.projectId })
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.id, params.data.id));

  if (!withdrawal) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const [owned] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, withdrawal.projectId), eq(projectsTable.userId, userId)));

  if (!owned) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  const [deleted] = await db
    .delete(withdrawalsTable)
    .where(eq(withdrawalsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Withdrawal not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
