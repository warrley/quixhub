# QuixHub frontend

Next.js (App Router) + TypeScript. Routes live under `app/`, grouped into `(auth)` (Login/Register, no shell) and `(shell)` (everything else, wrapped in `AppShell`). Shared UI lives in `src/components/`, fixture data in `src/data/`, and cross-cutting client state (theme, toasts, calendar) in `src/lib/` and `app/providers.tsx`.

```bash
npm install
npm run dev
```

See `../docs/architecture.md` → Frontend structure for the full layout.
