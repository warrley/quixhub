# Architecture

## Stack

- `frontend/` — React, deployed on Vercel. Not yet built.
- `backend/` — Node + Express + TypeScript, PostgreSQL via Drizzle ORM, S3-compatible object storage (MinIO locally). Not yet built.
- Single repo, two plain top-level directories (`frontend/`, `backend/`) — no npm/pnpm workspaces, no Turborepo, by deliberate choice (carried over from the prior iteration of this project).

## Module pattern

Backend features follow a fixed shape: `modules/<name>/<name>.service.ts` (pure Drizzle data access) + `modules/<name>/<name>.routes.ts` (Express Router, zod validation, auth gating) wired into `app.ts`. See the `quixhub-backend-module` skill for the full pattern.

## Data model

Not yet defined — will live in `backend/src/db/schema.ts` once the backend is scaffolded. Expected first tables: `users`, `disciplines`, materials/resources, calendar events, and feedback/reviews (pending the identity-policy decision in `docs/vision.md`).

## Local dev infra

`docker-compose.yml` at the repo root runs Postgres and MinIO — see `README.md` for setup steps.

## Privacy model

See `docs/vision.md`. Grade data (if/when built) stays local-first by default; course/professor feedback stays structured and anonymous regardless of how the identity-policy decision resolves.
