# Architecture

## Stack

- `frontend/` — Next.js (App Router) + TypeScript + React 19, Tailwind CSS v4 over a token-based theme (`src/styles/tokens.css`, registered via `@theme`, light + dark) — CSS Modules were migrated away entirely in favor of utility classes. Routes live under `app/`, grouped into `(auth)` (Login/Register, no shell) and `(shell)` (everything else, wrapped in `AppShell`): Home, Catálogo, Materiais, Calendário, IRA, Fluxograma, Perfil, plus an admin moderation queue. All screens are built against `src/data/mock.ts` fixture data — no backend API calls yet.
- Two features are local-first exceptions to the "no persistence yet" rule, since they don't need a backend to be useful and the project's privacy model requires grade data to stay client-side by default: the **IRA calculator** (`/ira` — manual entry or client-side parsing of a UFC SIGAA "Histórico Escolar" PDF via `pdfjs-dist`, formula verified exact against a real transcript) and the **fluxograma builder** (`/fluxograma` — prerequisite diagram via `@xyflow/react`, seeded from catalog data). Both persist to `localStorage` only.
- `backend/` — Node + Express + TypeScript, PostgreSQL via Drizzle ORM, S3-compatible object storage (MinIO locally). Not yet built.
- Single repo, two plain top-level directories (`frontend/`, `backend/`) — no npm/pnpm workspaces, no Turborepo, by deliberate choice (carried over from the prior iteration of this project).

## Frontend structure

- `src/components/` — reusable UI primitives (Button, Card, Field, Tag, Avatar, EmptyState, StatBar, Dialog, Toast, AppShell) and domain components (DisciplineCard, MaterialCard, EventChip, UploadDropzone, ModerationBadge, Greeting). Each component pairs a `.tsx` with a `.module.css`.
- `app/(auth)/` and `app/(shell)/` — one route folder per screen, each pairing `page.tsx` with a co-located `*.module.css`; `app/providers.tsx` composes all client-side context providers, `app/layout.tsx` is the root layout.
- `src/data/` — `types.ts` + `mock.ts`, the fixture data standing in for the backend until it exists.
- `src/lib/theme.tsx` — light/dark theme context (persisted to `localStorage`, defaults to OS preference).
- `src/lib/calendarStore.tsx` — in-memory context for calendar events (add/confirm), since there's no backend yet to persist them.
- `src/lib/iraStore.tsx` + `src/lib/ira.ts` + `src/lib/iraPdfParser.ts` — IRA calculator: localStorage-persisted context, the grading formula, and the client-only SIGAA PDF parser (dynamic-imported to keep `pdfjs-dist` out of the SSR bundle; its worker is served as a static asset under `public/`).
- `src/lib/fluxogramaStore.tsx` + `src/lib/fluxograma.ts` — fluxograma builder: localStorage-persisted context and the catalog-prerequisite-to-edge derivation (best-effort name matching against `Discipline.prerequisites`, which stores free-text names, not IDs).
- The discipline-detail feedback section renders both identity-policy variants (discipline-only vs. professor-level) side by side, flagged for the product owner to pick between per the open decision below.

## Module pattern

Backend features follow a fixed shape: `modules/<name>/<name>.service.ts` (pure Drizzle data access) + `modules/<name>/<name>.routes.ts` (Express Router, zod validation, auth gating) wired into `app.ts`. See the `quixhub-backend-module` skill for the full pattern.

## Data model

Not yet defined — will live in `backend/src/db/schema.ts` once the backend is scaffolded. Expected first tables: `users`, `disciplines`, materials/resources, calendar events, and feedback/reviews (pending the identity-policy decision in `docs/vision.md`).

## Local dev infra

`docker-compose.yml` at the repo root runs Postgres and MinIO — see `README.md` for setup steps.

## Privacy model

See `docs/vision.md`. Grade data (if/when built) stays local-first by default; course/professor feedback stays structured and anonymous regardless of how the identity-policy decision resolves.
