# QuixHub

A platform for the UFC Quixadá student community: centralized study materials, structured course/professor feedback, and a collaborative academic calendar — built by students, for students. See `docs/vision.md` for the full pitch and `docs/features.md` for what's shipped vs. planned.

## Stack

- `frontend/` — Next.js (App Router) + TypeScript, Tailwind CSS v4. Auth, Home, Catalog, Materials, Feedback, Calendar and Profile screens are built against mock data (not yet wired to the backend).
- `backend/` — Node + Express + TypeScript, PostgreSQL via Drizzle ORM, material uploads stored on local disk (`backend/uploads/`) for now — no S3/MinIO dependency.

## Local development

Infrastructure (Postgres):

```bash
docker compose up -d
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate   # only needed after schema.ts changes
npm run db:migrate
npm run seed:admin
npm run seed:disciplines
npm run dev
```

The API listens on `http://localhost:4000` (see `/api/health` and `/api/docs`).

## Tests

Backend service-layer tests (Vitest) run against a dedicated `quixhub_test` Postgres database in the same local instance — created and migrated automatically on first run, truncated between tests, never touches your dev data:

```bash
cd backend
npm test          # single run
npm run test:watch
```

## Docs

- `docs/vision.md` — product vision, scope, and open decisions
- `docs/features.md` — shipped vs. backlog features
- `docs/architecture.md` — stack, module pattern, data model
