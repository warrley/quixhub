# Graph Report - academy  (2026-07-16)

## Corpus Check
- 10 files · ~1,361 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 31 nodes · 24 edges · 7 communities (4 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Architecture
- Features
- Vision
- QuixHub
- CLAUDE.md
- docs-sync-reminder.sh
- graphify-auto-update.sh

## God Nodes (most connected - your core abstractions)
1. `Architecture` - 6 edges
2. `Features` - 5 edges
3. `Vision` - 5 edges
4. `QuixHub` - 4 edges
5. `docs-sync-reminder.sh script` - 1 edges
6. `graphify-auto-update.sh script` - 1 edges
7. `QuixHub` - 1 edges
8. `graphify` - 1 edges
9. `Stack` - 1 edges
10. `Local development` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (7 total, 3 thin omitted)

### Community 0 - "Architecture"
Cohesion: 0.29
Nodes (6): Architecture, Data model, Local dev infra, Module pattern, Privacy model, Stack

### Community 1 - "Features"
Cohesion: 0.33
Nodes (5): Backlog — Core (build first), Backlog — Later phases, Decisions carried from the prior iteration (Academy), Features, Shipped

### Community 2 - "Vision"
Cohesion: 0.33
Nodes (5): Constraints carried forward, Core problem, Open decisions, Scope, Vision

### Community 3 - "QuixHub"
Cohesion: 0.40
Nodes (4): Docs, Local development, QuixHub, Stack

## Knowledge Gaps
- **20 isolated node(s):** `docs-sync-reminder.sh script`, `graphify-auto-update.sh script`, `QuixHub`, `graphify`, `Stack` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `docs-sync-reminder.sh script`, `graphify-auto-update.sh script`, `QuixHub` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._