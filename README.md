# QuixHub

A platform for the UFC Quixadá student community: centralized study materials, structured course/professor feedback, and a collaborative academic calendar — built by students, for students. See `docs/vision.md` for the full pitch and `docs/features.md` for what's shipped vs. planned.

## Stack

- `frontend/` — React, deployed on Vercel. Not yet built.
- `backend/` — Node + Express + TypeScript, PostgreSQL via Drizzle ORM, S3-compatible object storage (MinIO locally). Not yet built.

## Local development

Infrastructure (Postgres + MinIO):

```bash
docker compose up -d
```

Backend and frontend setup instructions will be added here once those directories are scaffolded.

## Docs

- `docs/vision.md` — product vision, scope, and open decisions
- `docs/features.md` — shipped vs. backlog features
- `docs/architecture.md` — stack, module pattern, data model
