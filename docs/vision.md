# Vision

QuixHub is a platform for the UFC Quixadá student community that centralizes what's currently scattered across WhatsApp groups, SIGAA, and individual students' drives: study materials, course/professor context, deadlines, degree planning, document access, and study-group coordination.

## Core problem

Navigating university life is chaotic — past exams and summaries vanish into forgotten drives, there's no reliable way to know what a discipline or professor is actually like before enrolling, deadlines live in scattered group chats, and SIGAA itself is slow to navigate for routine document access.

## Scope

**Shipping first (core):**
1. **Study materials** — upload, discover, and access past exams, summaries, assignments, and code samples, organized by course/discipline.
2. **Course/professor feedback** — structured, anonymous signal on what a discipline is actually like (workload, exam format, group projects, teaching style). **Policy undecided**: whether feedback can reference a professor by name/identity, or must stay scoped to the discipline only, is an open decision — see "Open decisions" below.
3. **Collaborative calendar** — shared agenda for exam dates, assignment deadlines, and review sessions across disciplines, with materials linkable to specific events.

**Deferred (later phases):**
- Degree flowchart simulator (prerequisite what-ifs, elective planning) + GPA tracking with percentile ranking.
- In-app document viewer with highlighting/annotation and AI-generated summaries/practice questions.
- Professor contact directory, prioritized by preferred communication channel (email, Discord, Telegram).
- Structured forum + virtual study rooms, including scheduling monitorias.

## Open decisions

- **Professor feedback identity policy.** The prior iteration of this project (Academy) explicitly rejected any feature that let students rate or review an identifiable professor, on reputational-abuse and relationship-friction grounds — feedback was discipline-scoped only. QuixHub's "Know Before You Commit" pitch is closer to structured professor/course feedback. This needs a deliberate decision before the reviews module ships (see `quixhub-backend-module` skill, which flags this at write time).

## Constraints carried forward

- Feedback and reviews, whatever the final identity policy, must stay **structured and anonymous** — not free-text personal attacks.
- Grade-related data stays privacy-first: local-first by default, sync optional, never required.
