# EQCOFE — Graph Layer Retirement

## Owner directive

On 2026-10-06 the Project Owner directed that Graph/Graphify be removed from the active EQCOFE project workflow.

Effective policy after this retirement merges:

- Graph/Graphify is **not** a project gate, evidence source, dependency, readiness requirement, Definition-of-Done item, or agent prerequisite.
- No EQCOFE step may be blocked on graph freshness, graph health, query/path/explain evidence, graph watch, graph refresh, or graph artifact availability.
- Repository source, tests, CI, contracts, canonical documentation, GitHub and Linear remain the active evidence system.
- Existing historical Step 61/62/63/64 documents that mention Graphify remain historical records of what was true at the time; they do not create a live requirement.
- PR #319 is closed unmerged and HOS-181 is canceled.
- If the Owner later requests a graph, it may be built as an **optional whole-project analysis** at that time. It must not silently become a governance dependency again.

## Repository cleanup scope

The retirement removes:

- repository Graphify skill and references under `.codex/skills/graphify/**`;
- Graphify hook configuration;
- refresh/watch launchers;
- graph health/state scripts;
- Graphify operational-layer documentation;
- the four dedicated Graphify Task Contracts;
- active graph-first instructions from `AGENTS.md` and the local Codex launcher;
- the active `graphify-out/` ignore rule after local artifacts are cleaned;
- live Current State / Master Roadmap graph gating language.

No runtime application, frontend/backend feature, API/OpenAPI contract, database, package dependency, CI workflow, branch protection, or product-design artifact is changed by this retirement.

## Historical integrity

This task does not rewrite completed historical evidence to pretend Graphify never existed. Historical references are retained only as chronology and are explicitly superseded for active execution by this Owner directive.
