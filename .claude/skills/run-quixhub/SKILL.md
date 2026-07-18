---
name: run-quixhub
description: Launch and drive the QuixHub frontend in a browser to verify a change works. Use when asked to run, start, or screenshot the app, or to confirm a frontend change works end-to-end (not just typecheck/build).
---

# Running QuixHub

The frontend is a Next.js app currently backed entirely by fixture data in
`frontend/src/data/mock.ts` (no live backend calls yet — see
`docs/architecture.md`). The backend (`backend/`, Express on port 4000) exists
and typechecks but isn't wired into the frontend, so verifying a frontend
change never requires starting it.

## Dev server

```bash
cd frontend && npm run dev &
```

Next.js binds port 3000, or falls back to 3001+ with a warning if something
else already holds 3000 (common — a dev server from an earlier session is
often still running). Before starting a new one, check:

```bash
ps aux | grep "next dev" | grep -v grep
```

If one's already up, use it — don't start a second. Poll instead of sleeping:

```bash
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done'
```

## Drive it

No `chromium-cli` in this environment. `playwright-core` is already a
transitive dependency in `frontend/node_modules`, but no browser binary is
downloaded (`npx playwright install` would fetch one — don't; it's slow and
usually unnecessary). Point Playwright at the system Chromium instead:

```js
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
```

Node resolves `playwright-core` relative to the script's own location, not
cwd — write the driver script *inside* `frontend/` (e.g.
`frontend/.tmp-verify.mjs`), run it with plain `node`, then delete it. Running
it from elsewhere (even with `cd frontend &&`) throws `ERR_MODULE_NOT_FOUND`.

```bash
node frontend/.tmp-verify.mjs
rm frontend/.tmp-verify.mjs
```

Minimal driver skeleton:

```js
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3000/<route>', { waitUntil: 'networkidle' });
await page.screenshot({ path: '/tmp/screenshot.png', fullPage: true });
console.log('CONSOLE ERRORS:', JSON.stringify(errors));

await browser.close();
```

No auth/login flow exists yet — every route is reachable directly.

## Gotchas hit so far

- **Ambiguous button text.** `getByRole('button', { name: 'Adicionar' })` or
  `click('button:has-text("Adicionar"))` can match more than one button (e.g.
  "Adicionar" the row-submit button vs. "Adicionar semestre"). Pass
  `{ exact: true }` to `getByRole`, or scope the locator to a container.
- **`localStorage`-backed state starts empty.** Several features
  (`iraStore`, `calendarStore`, `fluxogramaStore`) persist to
  `localStorage` and render nothing (or a chart-gating `null`) until the
  user populates them through the UI first — a bare page load isn't enough
  to see conditional UI like the IRA distribution chart. Drive the actual
  input flow (fill a field, submit) before screenshotting the feature.
- Use `getByLabel(...)` for the IRA page's Nota/CH fields — they're plain
  `<input>`s without a stable `name`/`placeholder`, but do have associated
  `<label>`s.
