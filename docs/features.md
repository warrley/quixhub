# Features

## Shipped

- **Frontend UI for the three core features, against mock data (no backend yet)** — Auth (login/register), Home dashboard, discipline catalog + detail, materials browse/detail/upload + admin moderation queue, collaborative calendar, and profile/settings. See `docs/architecture.md` → Frontend structure.
- **Opiniões (course/professor feedback), wired end-to-end** — `/opinioes` (search + browse by discipline/professor) and `/opinioes/[offeringId]` (stats, anonymous comments, submission form), backed by the real API (`offerings` + `feedback` modules). Feedback is scoped to a discipline+professor+semester offering with a cryptographically anonymous voter hash — see `docs/vision.md` → Resolved decisions. Catálogo detail's "Opiniões por professor" section is wired to the same API.

## Backlog — Core (build first)

- **Wire remaining frontend screens to the backend API** — Opiniões and Catálogo detail are wired (see Shipped); Home, Materiais, and Fluxograma still run on `src/data/mock.ts`.

## Backlog — Later phases

- **Degree flowchart simulator** — visualize the degree plan, simulate skipping/adding prerequisites and electives, see the effect on graduation timeline.
- **GPA/IRA tracking with percentile ranking** — track GPA and see standing relative to peers in the same program.
- **In-app document viewer** — highlight, annotate, and generate summaries/practice questions from uploaded materials.
- **Professor contact directory** — contact info prioritized by each professor's preferred channel (institutional email, Discord, Telegram).
- **Forum + study rooms** — structured Q&A, virtual study room scheduling, monitoria organization.

## Decisions carried from the prior iteration (Academy)

- **Professor/teacher ratings were previously rejected** — reputational-abuse and relationship-friction risk from publicly rating identifiable staff. Revisited and resolved for QuixHub's Opiniões feature by scoping to structured workload/logistics fields only (no rating of the professor as a person) plus a cryptographic voter-anonymity hash — see `docs/vision.md` → Resolved decisions.
- **Grade privacy** — grade-related data should stay local-first by default with opt-in sync, not required auth, per the prior privacy model.

## if the historic not have a grade, it will placeholder
## when up another historic, exclude the existente
## normal curve, percentil 
