import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { SearchPartnersQueryParams, SearchPartnersResponse } from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { toPartner } from "../lib/partners";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/partners/search", async (req, res): Promise<void> => {
  const { userId } = req as unknown as AuthedRequest;
  const parsed = SearchPartnersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { data: users } = await clerkClient.users.getUserList({
    query: parsed.data.q,
    limit: 10,
  });

  const partners = users.filter((user) => user.id !== userId).map(toPartner);

  res.json(SearchPartnersResponse.parse(partners));
});

export default router;
