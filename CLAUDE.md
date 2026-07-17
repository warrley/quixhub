## QuixHub

A platform for the UFC Quixadá student community. See `docs/vision.md`, `docs/features.md`, and `docs/architecture.md` for the product and technical context. The backend/frontend are being scaffolded from scratch — see the `quixhub-backend-module`, `quixhub-db-migration`, and `quixhub-github` skills for the conventions to follow once code exists.

## Docs

After a feature lands (new route, new module, new major dependency, or a structural change like a framework migration), check whether `docs/architecture.md` still accurately describes the affected section (Stack, Frontend structure, Module pattern, Data model) and update it in the same session — don't leave it for a "docs pass" later. This is a manual check, not an automated hook: nothing enforces it, so treat it as part of finishing the feature, the same way `graphify update .` is part of finishing a code change.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
