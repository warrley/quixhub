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

- **Professor feedback identity policy [RESOLVED].** Feedback is scoped to the specific offering (`discipline` + `professor` + `semester`). To avoid reputational-abuse risks, the feedback form intentionally **omits** subjective ratings of the professor's character or teaching ability (e.g., no "didactic quality" or "overall rating" stars). Instead, it exclusively measures the **structural format** of the course with that professor: exam difficulty, workload, material quality, attendance policies, and group work. This strikes a balance: students get the "Know Before You Commit" value (because exams *do* vary by professor), but professors aren't subjected to Yelp-style personal reviews.

## Constraints carried forward

- Feedback and reviews, whatever the final identity policy, must stay **structured and anonymous** — not free-text personal attacks.
- Grade-related data stays privacy-first: local-first by default, sync optional, never required.
