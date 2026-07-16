---
name: quixhub-backend-module
description: Pattern for adding a new Express API module to the QuixHub backend. Use when adding a new feature/domain (new routes, new resource type) to backend/src/modules/.
---

# QuixHub Backend Module Pattern

Every backend feature follows the same shape.

1. **`modules/<name>/<name>.service.ts`** — pure data-access functions using the Drizzle client from `backend/src/db/client.ts` and tables from `backend/src/db/schema.ts`. No Express types here — these functions take plain arguments and return plain data, so they're easy to test and reuse.
2. **`modules/<name>/<name>.routes.ts`** — an Express `Router`. Validate all input with `zod` schemas (see any existing routes file for the pattern). Gate admin-only routes with `requireAdmin` and auth-required routes with `requireAuth`, both imported from `backend/src/modules/auth/auth.middleware.ts`. Wrap async handlers in `asyncHandler` from `backend/src/lib/errors.ts`, and throw `AppError(status, message)` for expected failures (404, 409, etc.) rather than hand-rolling `res.status().json()` error responses.
3. **Wire it up** in `backend/src/app.ts` — import the router and `app.use('/api/<name>', ...)`.
4. **Update the API docs** — add matching paths and any new schemas to `backend/src/docs/openapi.ts` (served at `/api/docs`). This is a hand-authored spec, not auto-generated from the routes, so it goes stale if skipped.
5. **Update `docs/features.md`** if this module ships a backlog item or is otherwise a user-facing feature — move it from Backlog to Shipped.

Before writing anything, check `docs/vision.md`. The professor/course feedback policy is still undecided (see project notes) — if a module touches instructor-identifying data, confirm the current stance before assuming either "anonymous structured feedback" or "no instructor judgment" applies.
