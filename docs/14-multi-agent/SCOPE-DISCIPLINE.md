# EQCOFE Multi-Agent Scope Discipline

## Rule

Scope protection is a two-layer control. It provides **canonical merge prevention**, not a claim that every possible out-of-band write to an unprotected feature branch is physically impossible.

### Layer 1 — pre-change validation for authorized agents

Before an authorized agent writes a repository path, it resolves the active Task Contract and validates the intended path with the canonical `validateChangedPaths` semantics from the Scope/Lock Controller. Forbidden scope has precedence over allowed write scope.

Example:

`node scripts/multi-agent/scope-validation.mjs --task docs/14-multi-agent/tasks/<task>.json --path <path>`

This layer is a required agent process rule. Repository code cannot cryptographically stop an operator or external API client that bypasses the authorized orchestration path and pushes directly to an unprotected feature branch.

### Layer 2 — required CI commit-history backstop

`test/multi-agent/scope-history-ci.test.mjs` is discovered by the existing `test/multi-agent/*.test.mjs` wildcard and therefore runs inside required `pnpm verify` on pull requests.

For a real `pull_request` event it:

1. reads exact PR `base.sha` and `head.sha` from `GITHUB_EVENT_PATH`;
2. resolves exactly one `Task Contract: \`docs/14-multi-agent/tasks/<task>.json\`` reference from the PR body;
3. ensures the exact base/head commits are available locally;
4. enumerates every branch-only commit from base to head;
5. validates every commit's changed paths, including both old and new paths for rename/copy operations;
6. fails closed on `OUT_OF_SCOPE` or `FORBIDDEN_SCOPE`.

A later revert cannot erase the evidence that an earlier commit introduced an unauthorized path. The regression suite explicitly creates an out-of-scope temporary file, commits it, deletes it in a later commit, confirms the final diff is empty, and still requires history validation to FAIL.

Local execution may skip only the live PR-context test because local execution has no authoritative GitHub pull-request event. On required PR Canonical CI, `SKIP`, `NOT_EXECUTED`, missing event context, missing Task Contract reference, or failed history validation blocks Item 7 closure.

## Rename semantics

Git name-status `R*` and `C*` entries validate both source and destination. A rename from an allowed path into a disallowed path is rejected even if Git reports it as one rename operation.

## Recovery playbook

Scope-safe CI recovery methods are:

- re-run an existing failed workflow/job;
- push a legitimate correction that is itself inside the active write scope;
- close/reopen a PR only when governance permits and artifact bytes do not change;
- use a metadata-only empty commit only if the task policy explicitly authorizes it.

Never create a marker file, temporary workaround file, or unrelated documentation edit outside the Task Contract merely to retrigger CI. If no scope-safe recovery path exists, the task remains blocked until governance defines one.

## Discovery-before-implementation practice

Before implementation, the Executor should freeze the canonical base, identify exact write paths, inspect concurrent PR overlap, determine deterministic risk, document known environment-dependent tests, and only then create the implementation artifact. This is a process practice, not a change to frozen `GOVERNANCE.md`.

## Residual boundary

After Item 7, a committed scope slip may still physically exist on a feature branch if a human/operator bypasses the authorized agent workflow. What Item 7 proves is narrower and enforceable: such a commit is detected by required PR verification and cannot become canonical through the governed merge path while the required checks remain active.
