# Architecture

## Stack

- `frontend/` — Next.js (App Router) + TypeScript + React 19, Tailwind CSS v4 over a token-based theme (`src/styles/tokens.css`, registered via `@theme`, light + dark) — CSS Modules were migrated away entirely in favor of utility classes. Routes live under `app/`, grouped into `(auth)` (Login/Register, no shell) and `(shell)` (everything else, wrapped in `AppShell`): Home, Catálogo, Opiniões, Materiais, Calendário, IRA, Fluxograma, Perfil, plus an admin moderation queue. Most screens still run on `src/data/mock.ts` fixture data; **Opiniões** (`/opinioes`, `/opinioes/[id]`) and the **Catálogo detail** page's discipline lookup + professor stats are wired to the real backend via `src/lib/api.ts` — see "Data model" below. Both are gated behind `UnderConstruction` in production builds pending full verification.
- Two features are local-first exceptions to the "no persistence yet" rule, since they don't need a backend to be useful and the project's privacy model requires grade data to stay client-side by default: the **IRA calculator** (`/ira` — manual entry or client-side parsing of a UFC SIGAA "Histórico Escolar" PDF via `pdfjs-dist`, formula verified exact against a real transcript) and the **fluxograma builder** (`/fluxograma` — prerequisite diagram via `@xyflow/react`, seeded from catalog data). Both persist to `localStorage` only.
- `backend/` — Node + Express + TypeScript, PostgreSQL via Drizzle ORM. JWT auth (httpOnly cookie), zod-validated routes. Material uploads are stored on local disk (`backend/uploads/`, via `multer`) for now — no S3/MinIO dependency; `src/lib/storage.ts` isolates this so it can be swapped for object storage later without touching the materials module. Entry point is `src/server.ts` (registers all routers under `/api`). Partially wired to the frontend now (see above) — remaining screens (Home, Materiais, Fluxograma) are still on mock data.
- Single repo, two plain top-level directories (`frontend/`, `backend/`) — no npm/pnpm workspaces, no Turborepo, by deliberate choice (carried over from the prior iteration of this project).

## Frontend structure

- `src/components/` — reusable UI primitives (Button, Card, Field, Tag, Avatar, EmptyState, StatBar, Dialog, Toast, AppShell) and domain components (DisciplineCard, MaterialCard, EventChip, UploadDropzone, ModerationBadge, Greeting), styled with Tailwind utility classes.
- `app/(auth)/` and `app/(shell)/` — one route folder per screen; `app/providers.tsx` composes all client-side context providers, `app/layout.tsx` is the root layout.
- `src/data/` — `types.ts` + `mock.ts`, the fixture data standing in for the backend for screens not yet wired.
- `src/lib/api.ts` — thin fetch client for the real backend (`NEXT_PUBLIC_API_URL`, defaults to `http://localhost:4000/api`), `credentials: 'include'` for the auth cookie. Used by Opiniões and the Catálogo detail page.
- `src/lib/theme.tsx` — light/dark theme context (persisted to `localStorage`, defaults to OS preference).
- `src/lib/calendarStore.tsx` — in-memory context for calendar events (add/confirm), since there's no backend yet to persist them.
- `src/lib/iraStore.tsx` + `src/lib/ira.ts` + `src/lib/iraPdfParser.ts` — IRA calculator: localStorage-persisted context, the grading formula, and the client-only SIGAA PDF parser (dynamic-imported to keep `pdfjs-dist` out of the SSR bundle; its worker is served as a static asset under `public/`). `src/lib/statistics.ts` (generic normal-distribution math) plus `src/data/iraDistribution.ts` (per-course mean/std) back the `IraDistributionChart` component, which plots the student's IRA against their program's assumed grade distribution.
- `src/lib/fluxogramaStore.tsx` + `src/lib/fluxograma.ts` — fluxograma builder: localStorage-persisted context and the catalog-prerequisite-to-edge derivation (best-effort name matching against `Discipline.prerequisites`, which stores free-text names, not IDs).
- The Catálogo detail page's "Opiniões por professor" section and the `/opinioes` screens implement the resolved professor-identity policy (see `docs/vision.md`) — feedback is per `offering` (discipline+professor+semester), never a direct rating of the professor as a person.

## Module pattern

Backend features follow a fixed shape: `modules/<name>/<name>.service.ts` (pure Drizzle data access) + `modules/<name>/<name>.routes.ts` (Express Router, zod validation, auth gating) wired into `src/server.ts`. See the `quixhub-backend-module` skill for the full pattern.

## Data model

Defined in `backend/src/db/schema.ts` (source of truth). Tables: `users`, `disciplines` (global catalog, no professor field), `offerings` (a discipline taught by one professor in one semester — unique on discipline+professor+semester), `materials` + `material_helpful_votes` (materials are global to a discipline, with an optional `offeringId` when a student knows which turma a file came from), `feedback` (scoped to an `offering`, anonymous at the API surface: `voterHash = sha256(userId + offeringId + FEEDBACK_SALT)` is stored instead of `userId`, unique per offering+voterHash so resubmitting updates rather than duplicates), `calendar_events` + `calendar_confirmations`. Aggregate fields the frontend expects (discipline `rating`/`responses`/`materialsCount`, material `helpfulCount`, event `confirmations`/`confirmed`, offering/discipline feedback stats) are computed on read rather than stored, to avoid write-side drift. The seed catalog (`backend/src/db/data/sigaa-2026-1.json`, loaded by `npm run seed:disciplines`) is the real UFC Quixadá SIGAA 2026.1 offering (104 disciplines, 134 offerings), hand-corrected for mojibake in the source export.

## Local dev infra

`docker-compose.yml` at the repo root runs Postgres — see `README.md` for setup steps.

## Privacy model

See `docs/vision.md`. Grade data (if/when built) stays local-first by default; course/professor feedback stays structured (no open-ended rating of the professor as a person) and voter-anonymous via the offering feedback hash scheme above.
