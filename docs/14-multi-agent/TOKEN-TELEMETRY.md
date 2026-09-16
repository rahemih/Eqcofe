# EQCOFE Multi-Agent Token Telemetry

## Purpose

Item 7 implements the provider-neutral telemetry contract from Multi-Agent Specification v3.1 §18. Telemetry is evidence about explicit reported model usage and task execution; it is not a billing system and must never invent provider-authoritative usage when the provider did not report it.

## Canonical storage

Each task resolves to exactly one repository-relative telemetry path:

`.eqcofe/telemetry/<task_id>.json`

The task id is restricted to a path-safe identifier. Telemetry is persisted only when at least one explicit usage event exists. Item 7 does not create a synthetic self-telemetry record merely to populate the directory.

## Required measurements

The aggregate record preserves at least:

- `input_tokens`
- `context_tokens_read`
- `output_tokens`
- `files_read`
- `files_written`
- `model_calls`
- `retry_count`
- `verification_calls`
- `terminal_state`
- `human_rejected`

`context_tokens_read` is a subset of `input_tokens`; it is never added a second time when calculating model-token consumption. The deterministic model-token total is `input_tokens + output_tokens`.

## Explicit provenance only

Accepted event provenance is one of:

- `PROVIDER_API` — explicit provider-reported usage;
- `MODEL_CLIENT` — explicit usage reported by the model client/runtime;
- `MANUAL_REPORTED` — a clearly labelled externally reported measurement.

An event may never be silently promoted to provider-authoritative evidence. A telemetry record marks `provider_authoritative=true` only when every contributing event is explicitly `PROVIDER_API`.

## Token budgets

V1 does not derive token budgets automatically from risk. The active Task Contract supplies:

- `expected_max`
- `soft_alert`
- `hard_cap`

The invariant is:

`0 < expected_max < soft_alert < hard_cap`

All values are safe non-negative integers. Status is deterministic:

- `NORMAL` — total model tokens are at or below `expected_max`;
- `EXPECTED_EXCEEDED` — above `expected_max` but below `soft_alert`;
- `SOFT_ALERT` — at or above `soft_alert` but below `hard_cap`;
- `HARD_CAP_EXCEEDED` — at or above `hard_cap`.

A hard-cap result is fail-visible evidence suitable for orchestration blocking. Item 7 does not silently rewrite the Task Contract budget. Item 9 may later calibrate recommended budgets per risk class from canonical telemetry.

## Calibration eligibility

Only tasks whose terminal state is `MERGED` and which were not human-rejected are primary calibration samples. `ABORTED` and human-rejected telemetry remains retained for audit, but is excluded from the primary P50/P75/P90 calibration sample.

## Persistence and mutation boundary

The telemetry helper writes only the resolved `.eqcofe/telemetry/<task_id>.json` target using an atomic temporary-file replacement. The caller remains responsible for having a Task Contract whose write scope authorizes that telemetry path. Repository code does not bypass Scope/Lock controls merely because the file is telemetry.
