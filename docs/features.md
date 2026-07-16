# Features

## Shipped

- **Frontend UI for the three core features, against mock data (no backend yet)** — Auth (login/register), Home dashboard, discipline catalog + detail, materials browse/detail/upload + admin moderation queue, structured feedback submission, collaborative calendar, and profile/settings. See `docs/architecture.md` → Frontend structure.

## Backlog — Core (build first)

- **Study materials backend** — upload, browse, and download past exams, summaries, assignments, and code samples, organized by course/discipline. Frontend UI is built (see Shipped); needs the Express/Drizzle/MinIO backend wired up.
- **Course/professor feedback backend** — structured, anonymous signal on discipline difficulty, exam format, group work, and teaching style. Identity policy (discipline-only vs. professor-identifying) is an **open decision** — see `docs/vision.md`; the frontend renders both variants side by side until it's resolved.
- **Collaborative calendar backend** — shared agenda for exam dates, assignment deadlines, and review sessions, with materials linkable to specific events. Frontend UI is built; needs persistence.

## Backlog — Later phases

- **Degree flowchart simulator** — visualize the degree plan, simulate skipping/adding prerequisites and electives, see the effect on graduation timeline.
- **GPA/IRA tracking with percentile ranking** — track GPA and see standing relative to peers in the same program.
- **In-app document viewer** — highlight, annotate, and generate summaries/practice questions from uploaded materials.
- **Professor contact directory** — contact info prioritized by each professor's preferred channel (institutional email, Discord, Telegram).
- **Forum + study rooms** — structured Q&A, virtual study room scheduling, monitoria organization.

## Decisions carried from the prior iteration (Academy)

- **Professor/teacher ratings were previously rejected** — reputational-abuse and relationship-friction risk from publicly rating identifiable staff. QuixHub's course/professor feedback feature needs to explicitly revisit this before shipping (see `docs/vision.md` → Open decisions).
- **Grade privacy** — grade-related data should stay local-first by default with opt-in sync, not required auth, per the prior privacy model.
