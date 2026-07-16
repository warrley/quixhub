# QuixHub — Design Brief

For use in Claude Design (or any design tool) to draft screens/prototypes. Product context: see `docs/vision.md`, `docs/features.md`, `docs/architecture.md`.

## Who this is for

UFC Quixadá students — mobile-heavy usage (checking between classes), low patience for friction (SIGAA is the thing they're escaping), campus community feel rather than corporate SaaS feel.

## Product tone

Warm, plain, student-to-student — not institutional. Portuguese-first (UFC Quixadá is a Brazilian campus community). No dark patterns, no upsell pressure — this is a free community tool. Should feel closer to a well-run Discord/Notion than to SIGAA.

## Scope for this design pass (core-first, per `docs/features.md`)

1. Study materials (upload, browse, download)
2. Course/professor feedback (structured, anonymous)
3. Collaborative calendar (exam/deadline tracking)

Deferred features (flowchart, GPA tracking, document viewer/AI, contact directory, forum) are NOT part of this pass — don't design screens for them yet, but keep IA flexible enough to add them later (see "Future nav slots" below).

---

## Screen inventory

### 1. Auth
- **Login** — email/password. Minimal, single form, no marketing fluff.
- **Register** — email (validate against UFC domain if feasible), password, name.
- No public admin signup; nothing here needs an "admin" variant of this screen.

### 2. Home / Dashboard
- Landing after login. Answers "what do I need to know right now?"
- Widgets: upcoming deadlines (next 3-5 from calendar), recently added materials in the student's tracked disciplines, quick-search bar.
- Empty state: student has no tracked disciplines yet → prompt to browse the catalog.

### 3. Discipline Catalog
- **List/grid view** — searchable, filterable (by semester offered, by professor if known).
- **Discipline detail page** — description, prerequisites, list of past materials tagged to it, feedback summary (aggregate score/tags), "track this discipline" action (feeds Home + Calendar).

### 4. Materials
- **Browse within a discipline** — filterable by type (past exam, summary, assignment, code sample), sortable by recency/most-helpful.
- **Material detail** — preview (PDF/image inline if possible), download button, uploader shown only if they opted in (default anonymous per privacy model), simple "this helped me" signal (not a comment thread — keep v1 light).
- **Upload flow** — pick discipline, pick type/tag, drag-and-drop file, optional note, submit. Goes to moderation queue (not visible publicly until approved) — show the student a "pending review" state after submit.
- **Admin moderation queue** (separate, admin-only view) — approve/reject list, minimal.

### 5. Course/Professor Feedback
- **Submit feedback** — structured form, NOT free text primarily: workload (scale), exam format (multi-select: prova, trabalho, seminário...), group work (yes/no + frequency), teaching style (slides/quadro/PDF), attendance policy. One optional short free-text field, moderated same as materials.
- **View feedback (aggregate)** — shown on the discipline detail page: bar charts / simple stat rows per structured dimension, not raw entries by default (protects anonymity, avoids pile-on effect). Design this screen two ways if possible — one where feedback stays discipline-scoped only, one where a professor-level view exists — since the identity policy in `docs/vision.md` is still undecided. Flag both options for the product owner to pick between.

### 6. Calendar
- **Month/week view** — deadlines and exam dates across the student's tracked disciplines, color-coded by discipline.
- **Event detail** — what it is, which discipline, linked materials (if a student attached study material to that specific exam/deadline).
- **Add event** — any student can propose a deadline (collaborative, per vision) — needs a lightweight state showing "unconfirmed" vs "confirmed by X students" to avoid one wrong entry misleading everyone.

### 7. Profile / Settings
- Tracked disciplines management, notification preferences (email/push for upcoming deadlines), account settings.
- No "public profile" — this app doesn't have social/identity features in v1 (uploads and feedback are anonymous by default).

---

## Navigation structure

Bottom nav (mobile) / sidebar (desktop), 4-5 top-level items max:
`Home` · `Catalog` · `Materials` (or fold into Catalog) · `Calendar` · `Profile`

**Future nav slots** (don't build now, but leave room): `Flowchart`, `Forum`, `Contacts` — likely additional top-level items or a "More" overflow once built.

---

## Component inventory (for the design system)

- Discipline card (name, code, short stat row: # materials, feedback summary badge)
- Material card (type icon/tag, title, file type, quick-download action)
- Feedback stat row/bar (label + visual scale, not raw numbers dominating)
- Calendar event chip (color-coded by discipline)
- Upload dropzone
- Moderation-pending badge
- Empty states (no materials yet, no tracked disciplines, no upcoming deadlines)
- Toast/inline confirmation (upload received, feedback submitted)

## Visual direction (starting point, adjust freely in Design)

- Light and dark mode both required (students study at night)
- Rounded, approachable shapes over sharp corporate edges
- One accent color tied to campus identity is fine, but avoid looking like an official UFC/SIGAA system — this is explicitly the alternative to that
- Accessible contrast and touch targets — mobile is the primary surface

---

## Open question to resolve before finalizing the Feedback screens

Professor feedback identity policy (discipline-only vs. professor-identifying) is undecided — see `docs/vision.md` → Open decisions. Design both variants of screen 5 if time allows, so the decision can be made with real mockups in hand rather than in the abstract.
