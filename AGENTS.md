## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- CI retrigger: Graphify governance repair -->


## EQCOFE local Codex agent

- Codex CLI is the local execution agent for this repository. It runs on the user's machine and inherits these repository instructions automatically.
- Start it from the repository with `.codex/start-eqcofe-local-agent.ps1`.
- Never mutate `main` directly. If the current branch is `main`, stop and create/switch to a task branch first.
- Before codebase-wide investigation, use Graphify first when `graphify-out/graph.json` exists.
- Keep changes inside the active Task Contract write scope. Treat forbidden paths and active locks as hard stops.
- After code changes, run the focused tests plus repository verification required by the active task, then refresh Graphify with `graphify update .`.
- Do not force-push, merge, change branch protection, or dispatch protected merge workflows unless the Owner explicitly authorizes that exact action.
- Prefer completing safe local read/write/test operations autonomously; ask the Owner only for a real Human Gate, credential/login action, or explicitly protected operation.
