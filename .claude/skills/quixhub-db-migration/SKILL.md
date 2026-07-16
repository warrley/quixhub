---
name: quixhub-db-migration
description: Workflow for changing the QuixHub database schema. Use when adding/editing tables or columns in backend/src/db/schema.ts, or running Drizzle migrations.
---

# QuixHub DB Migration Workflow

1. Make sure local infra is running: `docker compose up -d` from the repo root (check `docker-compose.yml` for the mapped Postgres port — it may not be the default `5432` if that's already occupied on the host).
2. Edit `backend/src/db/schema.ts` — add/change tables, columns, or `relations()` entries.
3. From `backend/`, run `npm run db:generate` (drizzle-kit). This writes a new SQL file under `backend/src/db/migrations/`.
4. **Read the generated SQL before applying it** — drizzle-kit sometimes proposes a destructive column rename as drop+recreate; catch that here, not after data loss.
5. Run `npm run db:migrate` to apply it (`backend/src/db/migrate.ts`).
6. If the change affects the seeded admin flow, `npm run seed:admin` should be idempotent — safe to re-run, no-ops if the admin already exists.
7. Update `docs/architecture.md` only if the *shape of the data model summary* changes — it should just point at `schema.ts` as source of truth, so most changes need no doc edit. Update `backend/src/docs/openapi.ts` if the change is reflected in any API response shape.
