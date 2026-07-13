import { clerkClient } from "@clerk/express";
import type { Partner } from "@workspace/api-zod";

type ClerkUser = Awaited<ReturnType<typeof clerkClient.users.getUser>>;

function displayName(user: ClerkUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return user.primaryEmailAddress?.emailAddress ?? user.id;
}

export function toPartner(user: ClerkUser): Partner {
  return {
    id: user.id,
    name: displayName(user),
    email: user.primaryEmailAddress?.emailAddress,
    imageUrl: user.imageUrl,
  };
}

/**
 * Batch-fetches Clerk users for the given ids (deduped, skips nulls) and
 * returns a lookup map. Used to attach `partner` info to withdrawal rows
 * without an N+1 request per row.
 */
export async function getPartnersByIds(
  ids: Array<string | null | undefined>,
): Promise<Map<string, Partner>> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))];
  if (uniqueIds.length === 0) return new Map();

  const { data: users } = await clerkClient.users.getUserList({ userId: uniqueIds });
  const map = new Map<string, Partner>();
  for (const user of users) {
    map.set(user.id, toPartner(user));
  }
  return map;
}
