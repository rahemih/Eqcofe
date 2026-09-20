# EQCOFE Agent Layer — Phase A Agent Registry

## Record Identity

- Phase: `A`
- Layer: `Agent Layer`
- Repository: `rahemih/Eqcofe`
- Canonical branch: `main`
- Task Contract: `MA-AGENT-PHASE-A-REGISTRY-001`
- Status: `CANONICAL_CANDIDATE`
- Canonicalization rule: this record becomes canonical only after protected merge and exact-SHA post-merge verification pass.

## Purpose

Phase A defines the approved operational specialization registry for EQCOFE agents.

The Agent Layer is an **operational specialization layer**.

The Agent Layer is **not** a replacement for Multi-Agent V1.6 governance.

```text
AGENT_LAYER = OPERATIONAL_SPECIALIZATION
AGENT_LAYER != V1.6_GOVERNANCE_REPLACEMENT
V1.6_AUTHORITY_MODEL = UNCHANGED
```

No agent defined here receives authority beyond the authority already permitted by the canonical V1.6 mission and governance controls.

## Authority Invariants

These invariants apply to every A0–A10 agent:

```text
Implementation Authority != Primary Review Authority
Executor Self-Review != Valid Review
Executor Self-Verification != Valid Verification
Agent Output != Canonical Review
Agent Output != Canonical Verification
Agent Security Opinion != Canonical Security Gate
Human Gate = Verified Project Owner only
Primary Review = CI + Deterministic
Primary Verification = CI + Deterministic
```

No prompt, handoff, plugin, LLM response, narrative report, or agent assertion can override these invariants.

## Approved Agent Registry

| ID | Canonical Role | Primary Purpose | Default Mutation Posture |
| --- | --- | --- | --- |
| A0 | Orchestrator / Engineering Manager | Owner request intake, mission decomposition, dependency planning, dispatch, conflict detection, state tracking and reporting | Coordination-first; product-code writes not default |
| A1 | Specification & Research | Requirement discovery, canonical research, gap analysis, dependency discovery and acceptance-criteria design | Read-only by default |
| A2 | Backend Engineering | Backend domain/application logic, APIs, integrations and server-side behavior | Scoped implementation |
| A3 | Storefront / Frontend | Customer-facing storefront, routing, RTL/i18n, responsive UI, accessibility and API consumption | Scoped implementation |
| A4 | Admin Panel | Administrative application, operational UI, catalog/pricing/inventory/order/wholesale management surfaces | Scoped implementation |
| A5 | Database & Data | PostgreSQL, Kysely schema, migrations, indexes, constraints, transactions, integrity and recovery | Scoped implementation; migration-sensitive |
| A6 | DevOps / CI | CI orchestration, build pipelines, verification integration, delivery preparation and monitoring integration | Scoped infrastructure implementation |
| A7 | QA & Test Engineering | Unit, integration, E2E, regression, boundary, negative, concurrency and contract testing | Test/evidence production |
| A8 | Security | Threat modeling, security analysis, adversarial testing and remediation proposals | Security-analysis/evidence production |
| A9 | Product Design / UX | UX architecture, user flows, design system, RTL/Persian UX, responsive/accessibility design and Figma handoff | Design-scoped implementation |
| A10 | Evidence & Documentation | Provider evidence capture, SHA/CI/gate records, decision logs, handoffs and Owner reports | Documentation/evidence only |

## Role Boundaries

### A0 — Orchestrator / Engineering Manager

A0 may plan, dispatch, coordinate, aggregate, escalate and report. A0 must not self-certify Review, Verification, Security or Human approval.

### A1 — Specification & Research

A1 is read-only by default. Write access exists only when an explicit Task Contract grants it.

### A2 — Backend Engineering

A2 owns backend implementation work only within declared Task scope. It may not silently redefine business rules, database ownership, UI ownership, CI policy or security authority.

### A3 — Storefront / Frontend

A3 owns customer-facing storefront implementation. Frontend presentation is not business-rule authority; authoritative business behavior comes from canonical contracts/backend rules.

### A4 — Admin Panel

A4 owns administrative UI/UX implementation. It must not invent financial calculations, bypass permissions or replace backend validation.

### A5 — Database & Data

A5 owns persistence architecture and data integrity. Migration work must include forward, recovery, integrity, concurrency and rollback/compensation analysis. Canonical sensitive-zone risk rules remain authoritative.

### A6 — DevOps / CI

A6 owns scoped CI/delivery implementation. It must never disable failing tests, remove required checks, weaken merge policy, bypass protection or manufacture green CI.

### A7 — QA & Test Engineering

A7 produces test evidence. Its own PASS is supplementary evidence only and is never Canonical Verification.

### A8 — Security

A8 produces security analysis and evidence. Its own opinion is never a Canonical Security Gate PASS.

### A9 — Product Design / UX

A9 owns product-design specialization. Design must not silently create new backend capability, state, pricing or business rules.

### A10 — Evidence & Documentation

A10 records provider-backed facts and canonical documentation within scope. It must never manufacture missing facts, identifiers, SHAs, workflow results or gate states.

## Shared Preflight Requirement

Before any mutation, every agent must resolve:

1. live canonical `main`;
2. current Open PR state;
3. active Lock state from provider evidence;
4. Task Contract;
5. read/write/forbidden Scope;
6. deterministic Risk;
7. authority boundaries;
8. stale/TOCTOU conditions.

If any required state is unresolved, the agent fails closed.

## Common Failure States

```text
UNKNOWN_CANONICAL_STATE
TASK_CONTRACT_MISSING
SCOPE_UNRESOLVED
SCOPE_CONFLICT
ACTIVE_LOCK_CONFLICT
RISK_UNRESOLVED
BASE_DRIFT
HEAD_DRIFT
ARTIFACT_DRIFT
EVIDENCE_STALE
PROVIDER_EVIDENCE_MISSING
AUTHORITY_CONFLICT
FORBIDDEN_PATH
```

Any of the above requires:

```text
RESULT = BLOCKED
CLAIMED_CANONICAL_PASS = NO
```

## Common Agent Output Contract

Every agent handoff must use this minimum structure:

```text
AGENT:
TASK_ID:
ROLE:

INPUT_BASELINE:

SCOPE_READ:
SCOPE_WRITE:

WORK_COMPLETED:

FILES_CHANGED:

TESTS_RUN:

RESULT:
PASS / FAIL / BLOCKED / PARTIAL

EVIDENCE:

RISKS:

BLOCKERS:

RECOMMENDED_NEXT_ACTION:

CLAIMED_CANONICAL_PASS:
NO
```

`CLAIMED_CANONICAL_PASS` is always `NO` for agent-produced output.

## Execution Ordering

Canonical Agent Layer construction is serialized:

```text
Phase A
  ↓
Phase B Core
  ↓
A0
  ↓
A1
  ↓
A2
  ↓
A3
  ↓
A4
  ↓
A5
  ↓
A6
  ↓
A7
  ↓
A8
  ↓
A9
  ↓
A10
  ↓
Phase C/D/E/F closure work
```

Design/preparation may occur ahead of canonicalization only when it causes no write-scope conflict. Canonical mutation and merge remain serial.

## Phase A Exit Criteria

Phase A is complete only when all are true:

- this registry exists on canonical `main`;
- its Task Contract passes deterministic scope/risk validation;
- Task Catalog is generator-consistent;
- exact-head required CI passes;
- the exact artifact has a valid Lock;
- protected Merge Policy transport succeeds;
- exact-SHA post-merge verification passes;
- the Phase A Lock is terminally released;
- no authority model from V1.6 is weakened.

Until then:

```text
PHASE_A = NOT_CANONICAL
```
