## EQCOFE local Codex agent

- Codex CLI is the local execution agent for this repository. It runs on the user's machine and inherits these repository instructions automatically.
- Start it from the repository with `.codex/start-eqcofe-local-agent.ps1`.
- Never mutate `main` directly. If the current branch is `main`, stop and create/switch to a task branch first.
- For codebase-wide investigation, inspect the canonical repository source, contracts, tests, current-state documentation and Git/CI evidence directly.
- Keep changes inside the active Task Contract write scope. Treat forbidden paths and active locks as hard stops.
- After code changes, run the focused tests plus repository verification required by the active task.
- Do not force-push, merge, change branch protection, or dispatch protected merge workflows unless the Owner explicitly authorizes that exact action.
- Prefer completing safe local read/write/test operations autonomously; ask the Owner only for a real Human Gate, credential/login action, or explicitly protected operation.

## Source-of-truth rule

GitHub `main`, CI/provider evidence, canonical contracts, tests and the live documents under `docs/12-current-state/` are the active technical source of truth. Optional analysis artifacts must never become a hidden prerequisite or blocking gate unless the Owner explicitly reintroduces them through a governed change.
