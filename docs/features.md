# Features

## Shipped

_Nothing yet — QuixHub is starting from scratch. See `docs/vision.md` for the rationale._

## Backlog — Core (build first)

- **Study materials** — upload, browse, and download past exams, summaries, assignments, and code samples, organized by course/discipline.
- **Course/professor feedback** — structured, anonymous signal on discipline difficulty, exam format, group work, and teaching style. Identity policy (discipline-only vs. professor-identifying) is an **open decision** — see `docs/vision.md`.
- **Collaborative calendar** — shared agenda for exam dates, assignment deadlines, and review sessions, with materials linkable to specific events.

## Backlog — Later phases

- **Degree flowchart simulator** — visualize the degree plan, simulate skipping/adding prerequisites and electives, see the effect on graduation timeline.
- **GPA/IRA tracking with percentile ranking** — track GPA and see standing relative to peers in the same program.
- **In-app document viewer** — highlight, annotate, and generate summaries/practice questions from uploaded materials.
- **Professor contact directory** — contact info prioritized by each professor's preferred channel (institutional email, Discord, Telegram).
- **Forum + study rooms** — structured Q&A, virtual study room scheduling, monitoria organization.

## Decisions carried from the prior iteration (Academy)

- **Professor/teacher ratings were previously rejected** — reputational-abuse and relationship-friction risk from publicly rating identifiable staff. QuixHub's course/professor feedback feature needs to explicitly revisit this before shipping (see `docs/vision.md` → Open decisions).
- **Grade privacy** — grade-related data should stay local-first by default with opt-in sync, not required auth, per the prior privacy model.
