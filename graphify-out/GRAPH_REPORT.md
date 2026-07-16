# Graph Report - quixhub  (2026-07-16)

## Corpus Check
- 53 files · ~10,463 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 278 nodes · 454 edges · 22 communities (18 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3240070d`
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
- Calendar.tsx
- plugins
- Vision
- React + TypeScript + Vite
- tsconfig.json
- CLAUDE.md
- docs-sync-reminder.sh
- graphify-auto-update.sh

## God Nodes (most connected - your core abstractions)
1. `react` - 24 edges
2. `compilerOptions` - 18 edges
3. `disciplineById()` - 17 edges
4. `compilerOptions` - 15 edges
5. `Button()` - 13 edges
6. `QuixHub — Design Brief` - 9 edges
7. `Screen inventory` - 8 edges
8. `useToast()` - 7 edges
9. `Architecture` - 7 edges
10. `disciplines` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Materials()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/src/pages/Materials.tsx → frontend/src/data/mock.ts
- `Calendar()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/src/pages/Calendar.tsx → frontend/src/data/mock.ts
- `DisciplineDetail()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/src/pages/DisciplineDetail.tsx → frontend/src/data/mock.ts
- `EventDetail()` --calls--> `disciplineById()`  [EXTRACTED]
  frontend/src/pages/EventDetail.tsx → frontend/src/data/mock.ts
- `CalendarContextValue` --references--> `CalendarEvent`  [EXTRACTED]
  frontend/src/lib/calendarStore.tsx → frontend/src/data/types.ts

## Import Cycles
- None detected.

## Communities (22 total, 4 thin omitted)

### Community 0 - "Architecture"
Cohesion: 0.25
Nodes (7): Architecture, Data model, Frontend structure, Local dev infra, Module pattern, Privacy model, Stack

### Community 1 - "Features"
Cohesion: 0.33
Nodes (5): Backlog — Core (build first), Backlog — Later phases, Decisions carried from the prior iteration (Academy), Features, Shipped

### Community 2 - "Vision"
Cohesion: 0.12
Nodes (22): EventChip(), formatDate(), KIND_GRADIENT, MaterialCard(), TYPE_LABEL, TYPE_TONE, StatBar(), calendarEvents (+14 more)

### Community 3 - "QuixHub"
Cohesion: 0.40
Nodes (4): Docs, Local development, QuixHub, Stack

### Community 4 - "CLAUDE.md"
Cohesion: 0.14
Nodes (17): Button(), ButtonProps, Size, Variant, InputProps, SelectField(), SelectProps, TextareaField() (+9 more)

### Community 5 - "docs-sync-reminder.sh"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 6 - "graphify-auto-update.sh"
Cohesion: 0.13
Nodes (14): App(), AppShell(), NAV_ITEMS, Avatar(), GRADIENTS, hashOf(), currentUser, Theme (+6 more)

### Community 7 - "Tag.tsx"
Cohesion: 0.10
Nodes (13): Card(), CardProps, ACCENT_VAR, DisciplineCard(), RATING_TONE, ModerationBadge(), Tag(), TagButton() (+5 more)

### Community 8 - "Home.tsx"
Cohesion: 0.18
Nodes (15): EmptyState(), ToastContext, ToastItem, ToastProvider(), useToast(), disciplineById(), materials, pendingMaterials() (+7 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 10 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, lucide-react, react, react-dom, react-router-dom, name, private, scripts (+10 more)

### Community 11 - "QuixHub — Design Brief"
Cohesion: 0.12
Nodes (16): 1. Auth, 2. Home / Dashboard, 3. Discipline Catalog, 4. Materials, 5. Course/Professor Feedback, 6. Calendar, 7. Profile / Settings, Component inventory (for the design system) (+8 more)

### Community 12 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 13 - "Calendar.tsx"
Cohesion: 0.25
Nodes (8): Dialog(), useCalendar(), Calendar(), DISCIPLINE_DOT, isoDate(), WEEKDAYS, EventDetail(), KIND_LABEL

### Community 14 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 15 - "Vision"
Cohesion: 0.33
Nodes (5): Constraints carried forward, Core problem, Open decisions, Scope, Vision

### Community 16 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **132 isolated node(s):** `docs-sync-reminder.sh script`, `graphify-auto-update.sh script`, `$schema`, `typescript`, `oxc` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `CLAUDE.md` to `Vision`, `graphify-auto-update.sh`, `Tag.tsx`, `Home.tsx`, `Calendar.tsx`, `plugins`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `CLAUDE.md`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `disciplineById()` connect `Home.tsx` to `Vision`, `CLAUDE.md`, `Calendar.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `docs-sync-reminder.sh script`, `graphify-auto-update.sh script`, `$schema` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vision` be split into smaller, more focused modules?**
  _Cohesion score 0.11724137931034483 - nodes in this community are weakly interconnected._
- **Should `CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.1396011396011396 - nodes in this community are weakly interconnected._
- **Should `docs-sync-reminder.sh` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._