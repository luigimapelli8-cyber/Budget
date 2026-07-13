# Suivi de retraits

Une appli qui suit les retraits d'argent sur plusieurs projets : somme de départ, lignes de retrait (titre + montant + URL), solde calculé automatiquement, export PDF, et comptes utilisateurs (Google ou email/mot de passe) pour que chacun ne voie que ses propres projets.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lance l'API (port assigné via `PORT`)
- `pnpm --filter @workspace/suivi-retraits run dev` — lance le frontend web
- `pnpm run typecheck` — typecheck complet de tous les packages
- `pnpm run build` — typecheck + build de tous les packages
- `pnpm --filter @workspace/api-spec run codegen` — régénère les hooks API et schémas Zod depuis `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/db run push` — pousse les changements de schéma DB (dev uniquement)
- Env requis : `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` (provisionnés automatiquement par Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API : Express 5, protégée par Clerk (`@clerk/express`)
- DB : PostgreSQL + Drizzle ORM
- Validation : Zod (`zod/v4`), `drizzle-zod`
- API codegen : Orval (depuis la spec OpenAPI)
- Frontend : React + Vite, wouter (routing), Tailwind v4, framer-motion, jsPDF
- Auth : Clerk (géré par Replit) — Email/mot de passe + Google, `@clerk/react` côté web

## Where things live

- `lib/api-spec/openapi.yaml` — contrat API source de vérité (schémas `Project*`, `Withdrawal*`)
- `lib/db/src/schema/projects.ts` — tables Drizzle `projectsTable` (scopée par `userId`) et `withdrawalsTable` (avec `title`)
- `artifacts/api-server/src/app.ts` — app Express, montage du proxy Clerk + `clerkMiddleware()`
- `artifacts/api-server/src/middlewares/requireAuth.ts` — middleware qui exige une session Clerk valide
- `artifacts/api-server/src/routes/{projects,withdrawals}.ts` — routes CRUD, toutes scopées par `userId`
- `artifacts/suivi-retraits/src/App.tsx` — landing page publique, pages sign-in/sign-up Clerk, liste de projets, page de détail (le "registre")

## Architecture decisions

- Auth via Clerk géré par Replit (pas Replit Auth) car il supporte Google SSO nativement.
- Chaque projet appartient à un `userId` Clerk ; toutes les routes `/projects*` sont protégées et filtrées par utilisateur.
- La page d'accueil (`/`) est publique et redirige les utilisateurs connectés vers `/projects` ; ne jamais rediriger un utilisateur déconnecté vers sign-in depuis `/`.

## Product

- Créer/renommer/supprimer des projets (depuis la liste ou la page de détail), chacun avec une somme de départ éditable.
- Ajouter des lignes de retrait avec titre, URL de provenance et montant ; le solde après chaque ligne se recalcule automatiquement.
- Exporter le registre complet d'un projet en PDF.
- Comptes utilisateurs : inscription/connexion par email+mot de passe ou Google, déconnexion visible dans l'en-tête.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Après tout changement au schéma OpenAPI, relancer `pnpm --filter @workspace/api-spec run codegen` avant de toucher aux routes/frontend qui consomment les types générés.
- Après tout changement au schéma Drizzle, pousser avec `pnpm --filter @workspace/db run push` (répondre "y" si un avertissement de perte de données apparaît sur des données de test).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
