# Graph Report - quixhub  (2026-07-16)

## Corpus Check
- 53 files · ~10,316 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 263 nodes · 424 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e58a4465`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Architecture
- Features
- Vision
- QuixHub
- CLAUDE.md
- docs-sync-reminder.sh
- graphify-auto-update.sh
- Tag.tsx
- Home.tsx
- compilerOptions
- package.json
- QuixHub — Design Brief
- devDependencies
- plugins
- Vision
- React + TypeScript + Vite
- CLAUDE.md
- docs-sync-reminder.sh
- graphify-auto-update.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 27 edges
2. `compilerOptions` - 19 edges
3. `disciplineById()` - 17 edges
4. `Button()` - 13 edges
5. `QuixHub — Design Brief` - 9 edges
6. `Screen inventory` - 8 edges
7. `useToast()` - 7 edges
8. `Architecture` - 7 edges
9. `disciplines` - 6 edges
10. `include` - 6 edges

## Surprising Connections (you probably didn't know these)
- `EventDetail()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/app/(shell)/calendario/[id]/page.tsx → frontend/src/data/mock.ts
- `Calendar()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/app/(shell)/calendario/page.tsx → frontend/src/data/mock.ts
- `Calendar()` --calls--> `useCalendar()`  [EXTRACTED]
  frontend/app/(shell)/calendario/page.tsx → frontend/src/lib/calendarStore.tsx
- `DisciplineDetail()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/app/(shell)/catalogo/[id]/page.tsx → frontend/src/data/mock.ts
- `Materials()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/app/(shell)/materiais/page.tsx → frontend/src/data/mock.ts

## Import Cycles
- None detected.

## Communities (19 total, 5 thin omitted)

### Community 0 - "Architecture"
Cohesion: 0.25
Nodes (7): Architecture, Data model, Frontend structure, Local dev infra, Module pattern, Privacy model, Stack

### Community 1 - "Features"
Cohesion: 0.33
Nodes (5): Backlog — Core (build first), Backlog — Later phases, Decisions carried from the prior iteration (Academy), Features, Shipped

### Community 2 - "Vision"
Cohesion: 0.13
Nodes (21): EventDetail(), KIND_LABEL, ACCENT_GRADIENT, DisciplineDetail(), TYPE_FILTERS, MaterialCard(), TYPE_LABEL, TYPE_TONE (+13 more)

### Community 3 - "QuixHub"
Cohesion: 0.40
Nodes (4): Docs, Local development, QuixHub, Stack

### Community 4 - "CLAUDE.md"
Cohesion: 0.12
Nodes (16): Calendar(), DISCIPLINE_DOT, isoDate(), WEEKDAYS, Button(), ButtonProps, Size, Variant (+8 more)

### Community 5 - "docs-sync-reminder.sh"
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+22 more)

### Community 6 - "graphify-auto-update.sh"
Cohesion: 0.14
Nodes (12): metadata, Providers(), AppShell(), isActivePath(), NAV_ITEMS, AuthLayout(), CalendarProvider(), Theme (+4 more)

### Community 7 - "Tag.tsx"
Cohesion: 0.10
Nodes (13): FILTERS, Card(), CardProps, ACCENT_VAR, DisciplineCard(), RATING_TONE, ModerationBadge(), Tag() (+5 more)

### Community 8 - "Home.tsx"
Cohesion: 0.16
Nodes (16): ModerationQueue(), ATTENDANCE, EXAM_FORMATS, FeedbackSubmit(), TEACHING_STYLES, WORKLOAD_SCALE, MaterialDetail(), TYPE_GRADIENT (+8 more)

### Community 9 - "compilerOptions"
Cohesion: 0.16
Nodes (11): greeting(), Home(), ACCENT_DOT, Avatar(), GRADIENTS, hashOf(), EmptyState(), EventChip() (+3 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, lucide-react, next, react, react-dom, devDependencies, oxlint, @types/node (+21 more)

### Community 11 - "QuixHub — Design Brief"
Cohesion: 0.12
Nodes (16): 1. Auth, 2. Home / Dashboard, 3. Discipline Catalog, 4. Materials, 5. Course/Professor Feedback, 6. Calendar, 7. Profile / Settings, Component inventory (for the design system) (+8 more)

### Community 14 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 15 - "Vision"
Cohesion: 0.33
Nodes (5): Constraints carried forward, Core problem, Open decisions, Scope, Vision

## Knowledge Gaps
- **121 isolated node(s):** `docs-sync-reminder.sh script`, `graphify-auto-update.sh script`, `$schema`, `typescript`, `oxc` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `graphify-auto-update.sh` to `Vision`, `CLAUDE.md`, `Tag.tsx`, `Home.tsx`, `compilerOptions`, `plugins`?**
  _High betweenness centrality (0.145) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `graphify-auto-update.sh`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `disciplineById()` connect `Home.tsx` to `compilerOptions`, `Vision`, `CLAUDE.md`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `docs-sync-reminder.sh script`, `graphify-auto-update.sh script`, `$schema` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vision` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._
- **Should `CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Should `docs-sync-reminder.sh` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._