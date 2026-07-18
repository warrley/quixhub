# Vision

QuixHub is a platform for the UFC Quixadá student community that centralizes what's currently scattered across WhatsApp groups, SIGAA, and individual students' drives: study materials, course/professor context, deadlines, degree planning, document access, and study-group coordination.

## Core problem

Navigating university life is chaotic — past exams and summaries vanish into forgotten drives, there's no reliable way to know what a discipline or professor is actually like before enrolling, deadlines live in scattered group chats, and SIGAA itself is slow to navigate for routine document access.

## Scope

**Shipping first (core):**
1. **Study materials** — upload, discover, and access past exams, summaries, assignments, and code samples, organized by course/discipline.
2. **Course/professor feedback ("Opiniões")** — structured, anonymous signal on what a discipline is like under a specific professor (material quality, exam/workload difficulty, attendance, group work). Feedback is scoped to a discipline+professor+semester **offering**, so it is professor-identified — see "Open decisions" below for why this is safe.
3. **Collaborative calendar** — shared agenda for exam dates, assignment deadlines, and review sessions across disciplines, with materials linkable to specific events.

**Deferred (later phases):**
- Degree flowchart simulator (prerequisite what-ifs, elective planning) + GPA tracking with percentile ranking.
- In-app document viewer with highlighting/annotation and AI-generated summaries/practice questions.
- Professor contact directory, prioritized by preferred communication channel (email, Discord, Telegram).
- Structured forum + virtual study rooms, including scheduling monitorias.

## Resolved decisions

- **Professor feedback identity policy (resolved 2026-07-17).** The prior iteration of this project (Academy) rejected identifiable-professor reviews on reputational-abuse and relationship-friction grounds. QuixHub resolves this by scoping feedback to a discipline+professor+semester **offering**, but deliberately excluding any field that judges the professor as a person — no "teaching quality" rating, no free-text-only professor review. The fields are workload/logistics signals about the course as taught (material quality, exam difficulty, work difficulty, attendance, group work) plus an optional comment. Voter identity is hashed (`sha256(userId + offeringId + FEEDBACK_SALT)`, salt server-only) so feedback is anonymous and non-attributable back to a student, mitigating the retaliation-risk half of the original concern; the reputational-abuse half is mitigated by the structured-fields constraint rather than by hiding the professor's name.

## Constraints carried forward

- Feedback and reviews, whatever the final identity policy, must stay **structured and anonymous** — not free-text personal attacks.
- Grade-related data stays privacy-first: local-first by default, sync optional, never required.
