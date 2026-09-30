# EQCOFE Graph Layer — Canonical Operational Architecture

## Status

Target terminal state: `GRAPH_LAYER = CANONICAL_OPERATIONAL`.

## Canonical graph

- The canonical persistent graph is repository-wide and lives locally at `graphify-out/graph.json` from the repository root.
- `graphify-out/GRAPH_REPORT.md`, `graph.html`, wiki output, manifests, interpreter metadata, and EQCOFE graph state are derived local artifacts and remain ignored by Git.
- Focused graphs such as `src/graphify-out/` or `apps/storefront/graphify-out/` are disposable acceleration caches. They may be rebuilt at any time and are never the canonical source of truth.
- Git `main` is the canonical code source of truth. The graph is an analysis index over a specific Git HEAD, not an authority over source.

## Freshness contract

The canonical graph is considered fresh only when:

1. `graphify-out/graph.json` exists and parses as JSON.
2. `graphify-out/.eqcofe-graph-state.json` exists.
3. The state file records the exact current Git HEAD.
4. Health inspection can count graph nodes and edges without structural failure.

If any condition fails, the graph is stale and must not be used as sole evidence for mutation decisions.

## Local operational loop

For codebase work, the local Codex agent follows:

`health -> graph query/path/explain -> focused source read -> mutation -> focused tests -> graph update -> record state -> health`

Rules:

- Fresh graph: query Graphify first.
- Stale graph: run the incremental refresh launcher before graph-first analysis.
- Missing graph: perform a canonical repository-wide build, then record state.
- Code changes: incremental refresh is mandatory before declaring local completion.
- Documentation-only changes: Graphify may set `needs_update`; complete semantic refresh when required by Graphify.
- Broad architecture questions may read `GRAPH_REPORT.md`; normal questions should prefer query/path/explain.
- Watch mode is optional during active coding waves and should be stopped with Ctrl+C when the wave ends.

## Automation entry points

- Health: `node scripts/graphify/health.mjs`
- Record current graph state: `node scripts/graphify/record-state.mjs`
- Incremental refresh: `powershell -ExecutionPolicy Bypass -File .codex/refresh-eqcofe-graph.ps1`
- Background watch: `powershell -ExecutionPolicy Bypass -File .codex/start-graphify-watch.ps1`
- Local Codex agent: `powershell -ExecutionPolicy Bypass -File .codex/start-eqcofe-local-agent.ps1`

## Recovery

If graph health reports malformed JSON or an unrecoverable update failure:

1. Preserve the current `graphify-out/` directory outside the repository if evidence is needed.
2. Remove only derived Graphify output, never repository source.
3. Rebuild the repository-wide graph from repository root.
4. Run `record-state.mjs`.
5. Run `health.mjs`.
6. Re-run at least one query, one path trace, and one explanation smoke test.

## Acceptance scenarios

The operational layer is accepted when the canonical graph is fresh at current HEAD and these scenarios work:

- Product Detail -> pricing -> inventory dependency trace.
- Product Detail -> cart integration trace.
- Storefront -> backend/API boundary trace.
- Impact analysis from a changed source file to related symbols/modules.
- Incremental refresh after a source edit.
- Health changes from FRESH to STALE when Git HEAD advances without graph refresh, then returns to FRESH after refresh.

## Non-goals

This layer does not introduce a production graph database, Neo4j/FalkorDB service, remote graph persistence, runtime application dependency, or CI requirement. It is repository-local developer/agent intelligence.
