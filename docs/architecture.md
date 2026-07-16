# Architecture

## Stack

- `frontend/` — React + Vite + TypeScript, deployed on Vercel. React Router for client-side routing, CSS Modules over a token-based theme (`src/styles/tokens.css`, light + dark) rather than a CSS framework. All seven core screens (Auth, Home, Catalog, Materials, Feedback, Calendar, Profile) are built against `src/data/mock.ts` fixture data — no API calls yet.
- `backend/` — Node + Express + TypeScript, PostgreSQL via Drizzle ORM, S3-compatible object storage (MinIO locally). Not yet built.
- Single repo, two plain top-level directories (`frontend/`, `backend/`) — no npm/pnpm workspaces, no Turborepo, by deliberate choice (carried over from the prior iteration of this project).

## Frontend structure

- `src/components/` — reusable UI primitives (Button, Card, Field, Tag, Avatar, EmptyState, StatBar, Dialog, Toast, AppShell) and domain components (DisciplineCard, MaterialCard, EventChip, UploadDropzone, ModerationBadge). Each component pairs a `.tsx` with a `.module.css`.
- `src/pages/` — one file (plus `.module.css`) per screen, matching the screen inventory in `docs/design-brief.md`.
- `src/data/` — `types.ts` + `mock.ts`, the fixture data standing in for the backend until it exists.
- `src/lib/theme.tsx` — light/dark theme context (persisted to `localStorage`, defaults to OS preference).
- `src/lib/calendarStore.tsx` — in-memory context for calendar events (add/confirm), since there's no backend yet to persist them.
- The discipline-detail feedback section renders both identity-policy variants (discipline-only vs. professor-level) side by side, flagged for the product owner to pick between per the open decision below.

## Module pattern

Backend features follow a fixed shape: `modules/<name>/<name>.service.ts` (pure Drizzle data access) + `modules/<name>/<name>.routes.ts` (Express Router, zod validation, auth gating) wired into `app.ts`. See the `quixhub-backend-module` skill for the full pattern.

## Data model

Not yet defined — will live in `backend/src/db/schema.ts` once the backend is scaffolded. Expected first tables: `users`, `disciplines`, materials/resources, calendar events, and feedback/reviews (pending the identity-policy decision in `docs/vision.md`).

## Local dev infra

`docker-compose.yml` at the repo root runs Postgres and MinIO — see `README.md` for setup steps.

## Privacy model

See `docs/vision.md`. Grade data (if/when built) stays local-first by default; course/professor feedback stays structured and anonymous regardless of how the identity-policy decision resolves.
