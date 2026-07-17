---
name: quixhub-github
description: Git and GitHub conventions for the QuixHub repo. Use when committing changes, writing commit messages, opening PRs, or deciding what to stage in this project.
---

# QuixHub Git Conventions

- Commit deliberately as logical units of work land — don't wait for the user to explicitly ask each time. Once a feature/fix/chore is complete and verified (typecheck/build passing), commit it before moving on to the next unit, rather than letting a large pile of uncommitted changes accumulate.
- Never stage `backend/.env`, `backend/node_modules/`, `backend/dist/`, `frontend/node_modules/`, or `frontend/.next/` (or equivalent build output) — cover these in the root `.gitignore`. If `git status` ever shows one of these as untracked instead of ignored, stop and check `.gitignore` before committing rather than force-adding it.
- Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`, e.g. `feat(materials): add upload endpoint`, `fix(auth): correct token expiry check`, `docs(readme): update setup steps`. Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`. Use `!` after the type/scope (`feat(api)!: ...`) or a `BREAKING CHANGE:` footer for breaking changes. Body (if any) is 1-2 sentences focused on *why*, not a restatement of the diff.
- Prefer one commit per logical unit of work (e.g., "add materials module" separate from "add API docs") over one giant commit, unless the user asks to bundle them.
- Never force-push, amend published commits, or skip hooks unless the user explicitly asks.
- PRs: keep title under ~70 chars, put detail in the description, and include a test plan checklist for anything with a runtime surface (per this project's `verify` skill conventions).
