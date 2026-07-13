---
name: Clerk auth on user-scoped resources
description: Retrofitting Clerk auth onto an existing CRUD API where resources need per-user ownership.
---

When adding Clerk auth to an app that already has CRUD tables (e.g. projects owned by a user), a `userId text not null` column on the top-level table is not enough by itself — every route, including nested-resource routes (e.g. `/projects/:id/withdrawals`, `/withdrawals/:id`), must verify ownership by joining back to the owning row before reading/writing, not just filter the top-level list endpoint.

**Why:** it's easy to protect `/projects` (add `.where(eq(projects.userId, userId))`) but forget that `/withdrawals/:id` has no `userId` column itself — it only has `projectId`. Without an explicit ownership check via a join/select against the parent table, a signed-in user could read or mutate another user's child rows by guessing IDs.

**How to apply:** for any child resource, look up its parent row scoped by `userId` first (404 if not found/not owned), then perform the child operation. Do this for get/update/delete on the child, not just list/create.

Also: when adding a `not null` column to a table with existing rows (e.g. `userId`), drizzle-kit push will refuse via an interactive prompt in non-TTY shells. If the existing rows are just test/dev data, delete them via `executeSql` first, then push — don't add a spurious default value to dodge the prompt if that default doesn't make sense in production.
