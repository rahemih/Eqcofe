# EQCOFE — FINAL EXECUTION MISSION V1.5

## Dependency Cleanup → Item 10 → Multi-Agent V1 Operational Acceptance

### Canonical Repository

`rahemih/Eqcofe`

### Canonical Branch

`main`

### Mission Version

`V1.5`

### Mission Status

`FROZEN`

### Review Status

```text
Advisor Deep Audit = COMPLETE

Previous Critical Findings = 0

Final Advisor Findings = 22

22 / 22 Findings = INCORPORATED

```

---

# 0. GLOSSARY

## Evidence

```text
Machine-verifiable proof of a fact, state,
identity, artifact, execution, or result.

```

## Gate

```text
A deterministic decision point that evaluates
required Evidence before allowing a transition.

```

## Gate Status

```text
The normalized result of Gate evaluation.

```

## Evidence Matrix

```text
The canonical tabular record containing
Gate Evidence across all Acceptance Tests.

```

## Machine-Verifiable

A claim is `Machine-Verifiable` if and only if:

```text
1. It produces deterministic output.

2. The result can be independently recomputed.

3. Recomputation uses canonical sources only.

4. Human or LLM interpretation is not required
   to derive PASS / FAIL.

5. The evidence can be bound to an immutable
   or authoritative repository/GitHub fact.

```

Examples:

```text
VALID:
- Commit SHA
- Merge SHA
- CI check conclusion
- Artifact SHA-256
- Deterministic risk output
- Ruleset state
- Lock-controller output

NOT SUFFICIENT:
- "Executor says it passed"
- "Advisor believes it is correct"
- "LLM says complete"
- Unrecorded manual testing

```

---

# 1. PURPOSE

This Mission must provide practical, Evidence-Backed proof that EQCOFE Multi-Agent V1 can:

```text
Correctly classify

Risk-bound execute

Scope-bound execute

Lock-protect

Workflow-state enforce

Artifact-bind

Evidence-provenance validate

Independently review

Independently verify

Fail-Closed stop

Human-Gate protect

Protected-Merge transport

TOCTOU-protect

Exact-SHA post-merge verify

```

authorized tasks.

No result may be considered PASS solely based on trust in:

```text
Executor
Agent
Advisor
LLM
Narrative Report
Manual Assertion

```

---

# 2. DEFINITION OF PRODUCTION TRUSTED

The declaration:

```text
EQCOFE MULTI-AGENT V1
= PRODUCTION TRUSTED

```

has only the meaning defined by the scope in this Section.

## INCLUDED SCOPE

```text
Multi-Agent governance pipeline

Task classification

Deterministic risk classification

Workflow lifecycle enforcement

Scope enforcement

Lock acquisition/conflict/release

Artifact binding

Evidence provenance

Review separation

Verification separation

Security Gate enforcement

Human Gate enforcement

Merge Policy enforcement

Branch Protection validation

Trusted transport validation

Protected Merge

TOCTOU protection

Head/Base drift handling

Exact-SHA Post-Merge verification

Fail-Closed behavior

Protection Drift detection

Test/Production evidence isolation

```

## NOT INCLUDED

```text
Proof that the entire EQCOFE product is bug-free

Proof of complete security of all application code

Production deployment completion

Infrastructure/SRE certification

Completion of all business requirements

Quantitative token-budget calibration
unless separately proven

Complete performance certification

V1.1 completion

V2 completion

Third-party service reliability

```

Therefore:

```text
MULTI-AGENT PRODUCTION TRUSTED
!=
ENTIRE EQCOFE PRODUCT CERTIFIED

```

Every later use of the term `PRODUCTION TRUSTED` refers to this Section.

---

# 3. OWNER AND AUTHORITY IDENTIFICATION

## Expected Project Owner

Starting Context:

```text
Expected GitHub Owner Identity:
rahemih

```

However, this identity MUST be live-verified before any Human Gate is accepted.

Resolve:

```text
Canonical repository owner

Authenticated GitHub actor

Trusted Owner identity expected by governance

```

Owner Approval is valid only when:

```text
Authenticated GitHub identity
=
Verified Project Owner identity

```

If Owner Identity cannot be resolved:

```text
OWNER_IDENTITY = UNRESOLVED

HUMAN_GATE = BLOCKED

```

## Authorities

```text
Implementation:
Executor / Assigned Agent

Primary Review:
CI + Deterministic

Verification:
CI + Deterministic

Security:
Canonical Security Gate

Supplementary Review:
Advisor
OPTIONAL
NOT BLOCKING
NOT SUBSTITUTING

Human Gate:
Verified Project Owner

```

---

# 4. MISSION LIFECYCLE — SINGLE CANONICAL ORDER

The Mission Lifecycle has exactly this order:

```text
1. Mission Drafting

2. Canonical Registration

3. Mission Hash Generation

4. Governance Registration

5. MISSION_SPEC_STATUS = FROZEN

6. Stage A begins

```

Canonical invariant:

```text
Registration
→ Hash
→ Governance Registration
→ Freeze
→ Stage A

```

No other Section may establish a different order.

---

# 5. TWO DISTINCT FREEZE CONCEPTS

## 5.1 Mission Specification Freeze

Before Stage A:

```text
MISSION_SPEC_STATUS = FROZEN

```

Freeze in this Mission means:

```text
BYTE-LEVEL FREEZE

```

After Freeze:

```text
Any byte change
including whitespace
line ending
punctuation
formatting
or content

```

requires:

```text
New Mission Version

New Mission Hash

Re-Registration

```

Therefore:

```text
Semantic-only silent edits
= PROHIBITED

```

---

## 5.2 Acceptance Closure

After Phase 3:

```text
ACCEPTANCE_RECORD_STATUS
= CANONICAL_CLOSED

```

Therefore:

```text
MISSION_SPEC_FROZEN
!=
ACCEPTANCE_RECORD_CANONICAL_CLOSED

```

---

# 6. CANONICAL MISSION FILES

First determine whether the repository already has an official Mission naming convention.

If it exists:

```text
EXISTING CANONICAL CONVENTION WINS

```

If no convention exists, establish the following V1 convention:

```text
Directory:
docs/14-multi-agent/missions/

Mission:
EQCOFE-MULTI-AGENT-V1.5-EXECUTION-MISSION.md

Registry:
REGISTRY.md

Acceptance Closure:
EQCOFE-MULTI-AGENT-V1.5-ACCEPTANCE-CLOSURE.md

Amendments Registry:
AMENDMENTS-REGISTRY.md

```

Creating a new convention must itself remain inside the Mission Registration scope.

---

# 7. MISSION HASH STANDARD

Mission Hash:

```text
SHA-256

```

computed over:

```text
Exact Mission File Bytes

UTF-8 encoding

LF line endings

```

Formula:

```text
SHA-256(
  exact UTF-8
  LF-normalized
  canonical Mission bytes
)

```

---

# 8. CANONICAL HASH IMPLEMENTATION

First discover the existing Canonical Artifact Hash Generator in the repository.

Starting Context may indicate an implementation such as:

```text
scripts/multi-agent/artifact-hash-generator.mjs

```

but the path MUST NOT be assumed without live verification.

If the Canonical Generator supports exact-byte Mission hashing:

```text
USE CANONICAL GENERATOR

```

If it does not, any new hasher must:

```text
1. Implement the algorithm defined in Section 7

2. Include a known SHA-256 test vector

3. Include a deterministic test

4. Pass independent verification

5. Be canonically registered

```

before use.

Ad-hoc hashing is prohibited.

---

# 9. SELF-REFERENCE PROTECTION

The Mission Hash must not be stored inside the exact byte sequence being hashed.

Primary Registration:

```text
Mission Registry / Governance Registry

```

If `REGISTRY.md` exists or is created according to Section 6, record:

```text
Version
Mission File
Mission Hash
Registration UTC
Status

```

The Mission File itself must not contain its own hash inside the hashed content.

---

# 10. SOURCE OF TRUTH

Order of authority:

```text
1. Canonical GitHub Repository

2. main

3. Exact main HEAD

4. Pull Request facts

5. GitHub Actions facts

6. Required Status Checks

7. Active Ruleset / Branch Protection

8. Merge Policy Controller

9. Workflow Controller

10. Scope / Lock Controller

11. Risk Classifier

12. Artifact Binding Controller

13. Task Contracts

14. Canonical Documentation

15. Historical Reports

16. Conversation / Prompt Context

```

Rule:

```text
LIVE CANONICAL EVIDENCE WINS

```

---

# 11. EVIDENCE TRUST HIERARCHY

## LEVEL 1 — Immutable / Provider Facts

```text
Commit SHA
Merge SHA
PR state
Workflow Run ID
Check conclusion
Ruleset state
Integration identity

```

## LEVEL 2 — Deterministic Controllers

```text
Risk
Scope
Lock
Workflow State
Artifact Hash
Protection State
Merge Eligibility

```

## LEVEL 3 — Artifact-Bound Gates

```text
Review
Security
Human Approval
Lock Evidence

```

## LEVEL 4 — Supplementary

```text
Advisor Review

```

## LEVEL 5 — Narrative

```text
Reports
Summaries
Explanations
LLM conclusions

```

Rule:

```text
LEVEL 4 / 5
cannot replace
LEVEL 1 / 2 / 3

```

---

# 12. EVIDENCE MINIMUM FIELDS

Every Evidence item, where applicable, must include:

```text
Task ID

Mission Version

Mission Hash

PR Number

Base SHA

Head SHA

Artifact Hash

Gate Type

Raw Result

Normalized Result

Actor / Authority

Transport Identity

Timestamp

Workflow Run ID

Evidence / Comment / Check ID

```

---

# 13. TIMESTAMP STANDARD

The only canonical timestamp format is:

```text
YYYY-MM-DDTHH:MM:SSZ

```

Example:

```text
2026-09-20T06:19:53Z

```

Specification:

```text
RFC 3339

UTC

Z suffix

seconds precision

no fractional seconds

```

Not accepted:

```text
Local timezone

+00:00 suffix

Fractional seconds

Timezone-less values

```

---

# 14. RESULT NORMALIZATION

The raw provider result must always be preserved.

The normalized result must be recorded separately.

```text
success
→ PASS

failure
→ FAIL

timed_out
→ FAIL

startup_failure
→ FAIL

cancelled
→ NOT_EXECUTED

```

## action_required

Default:

```text
action_required
→ BLOCKED

```

Exception:

If the Canonical workflow machine-verifiably proves that `action_required` is expected behavior in that context—for example, waiting for an authorized Human Gate:

```text
action_required
→ PENDING

```

The exception must be machine-verifiable.

## skipped

If non-applicability is machine-verifiable:

```text
skipped → N/A

```

Otherwise:

```text
skipped → NOT_EXECUTED

```

## neutral

If the Canonical workflow explicitly defines it as non-applicable:

```text
neutral → N/A

```

Otherwise:

```text
neutral → BLOCKED

```

Any unknown result:

```text
UNKNOWN_RESULT
→ BLOCKED

```

---

# 15. CANONICAL STATUS VOCABULARY

Gate status may only be:

```text
PASS
FAIL
BLOCKED
PENDING
NOT_EXECUTED
N/A

```

Task State must follow the Canonical Workflow State Machine.

Rules:

```text
PENDING != PASS

NOT_EXECUTED != PASS

BLOCKED != PASS

FAIL != WARNING

UNKNOWN != PASS

```

---

# 16. TRUSTED TRANSPORT IDENTITY

During Pre-Execution, resolve:

```text
Required check names

Required GitHub Integration ID

Trusted gate transport

Trusted evidence signer/author

Ruleset identity

Merge workflow identity

Human Gate transport

```

If the Trust Model cannot be resolved:

```text
TRUST_MODEL = UNRESOLVED

MISSION = BLOCKED

```

Recovery:

```text
STOP

Root Cause Investigation

Governance Remediation

Trust Model Re-Verification

Resume only after PASS

```

---

# 17. BYPASS ACTOR DEFINITION

A Bypass Actor is any entity capable of overriding Branch/Ruleset protection, such as:

```text
Specific user

Team

Repository role

GitHub App

Integration

Admin bypass

```

Verification:

```text
Read live Ruleset bypass configuration

Resolve every actor

Compare against canonical expected policy

```

Default V1 expectation:

```text
NO UNDOCUMENTED BYPASS ACTOR

```

If Canonical V1 policy requires an empty bypass list:

```text
Expected Bypass Actors = 0

```

Any unexpected actor:

```text
PROTECTION_DRIFT
→ BLOCK

```

---

# 18. REQUIRED PROVENANCE CAPABILITIES

The system must machine-verifiably prove all four capabilities:

```text
P1:
Distinguish Executor Evidence
from Deterministic Review Evidence

P2:
Bind evidence to exact Artifact Hash

P3:
Reject Self-Review substitution

P4:
Reject Self-Verification substitution

```

If even one is incomplete:

```text
PROVENANCE_CAPABILITY = INCOMPLETE

V1_ACCEPTANCE = BLOCKED

```

Recovery:

```text
Root Cause
→ Governed Remediation
→ Re-Test

```

---

# 19. AUTHORITY INVARIANTS

```text
Implementation Authority
!=
Primary Review Authority

Executor Self-Review
!=
Valid Review

Executor Self-Verification
!=
Valid Verification

Human Approval
!=
Review

Human Approval
!=
Verification

Human Approval
!=
Security

Advisor Review
!=
Primary Review

```

---

# 20. HUMAN APPROVAL SCOPE

Human Approval is valid only in:

```text
HUMAN_PENDING

```

and only for the exact approved context.

Minimum binding:

```text
Task ID
Head SHA
Artifact Hash
Verified Owner Identity

```

Human Approval must not replace:

```text
Review

Verification

Security

CI

Merge Policy

```

Early approval:

```text
INVALID / NOT_USABLE

```

---

# 21. EXACT ARTIFACT DEFINITION

`Exact Artifact` is defined by the Canonical Artifact Hash Generator.

At minimum, under the current expected model, it includes:

```text
Normalized repository-relative paths

File operations:
ADD
MODIFY
DELETE
RENAME

Exact file content bytes

```

unless the Canonical Generator explicitly defines otherwise.

By default, the Artifact Hash does not include:

```text
Commit SHA

Timestamp

Branch name

PR number

File permission
unless canonical spec explicitly includes it

```

Artifact semantics must not be invented by this Mission. The Canonical Generator is authoritative.

---

# 22. TOCTOU PROTECTION

Before every Merge:

```text
Re-resolve Head SHA

Re-resolve Base SHA

Recompute/verify Artifact Hash

Revalidate Risk

Revalidate Scope

Revalidate Lock

Revalidate Review

Revalidate Security

Revalidate Human Approval

Revalidate Required CI

Revalidate Protection

Revalidate Merge Eligibility

```

Any mismatch:

```text
MERGE = BLOCKED

```

---

# 23. HEAD DRIFT RULE

If Head SHA changes:

```text
Artifact Hash = RECOMPUTE

Review = STALE

Security = STALE if applicable

Human Approval = STALE if applicable

CI = RE-RUN

Merge Policy = RE-RUN

Lock = REVALIDATE

```

---

# 24. BASE DRIFT RULE

If Base SHA changes after Gate evaluation:

```text
MERGE_ELIGIBILITY = INVALIDATED

```

At minimum, re-run:

```text
CI
Phase A
Risk
Scope
Lock
Protection
Merge Policy

```

Artifact-bound Evidence may only be reused with deterministic compatibility proof.

Otherwise:

```text
REVALIDATION_REQUIRED

```

---

# 25. GLOBAL SAFETY

Prohibited:

```text
Direct main write

Force push

History rewrite

Branch protection bypass

Ruleset weakening

Required check removal

Fake PASS

Manual merge outside canonical path

Risk downgrade below deterministic floor

Lock override

Scope bypass

Stale evidence reuse

Unauthorized evidence substitution

Test evidence replay in Production

Production protection mutation for testing

Automatic rollback outside governed process

```

Governing principle:

```text
FAIL CLOSED

```

---

# 26. COST / RESOURCE POLICY

Allowed:

```text
Existing GitHub capabilities

GitHub Actions within available quota

Existing Repository Secrets

Existing CI/CD infrastructure

Existing project tooling

Approved free-tier resources

```

Not allowed without Owner authorization:

```text
New paid tool

New paid service

New paid AI service/model

New paid CI capacity

```

Exception:

```text
EXPLICIT OWNER APPROVAL

```

---

# STAGE A

# DEPENDENCY CLEANUP

Scope:

```text
#204
#205
#206

+
all legitimate replacement chains

```

---

# A1 — LIVE AUDIT

For every chain, record:

```text
Original PR

Original State

Original Base

Original Head

Original Risk

Original Scope

Replacement PR

Replacement Base

Replacement Head

Replacement Risk

Risk Continuity

Artifact Hash

Scope

Lock

CI

Phase A

Review

Security

Human Gate

Merge Policy

Merge SHA

Post-Merge Run

Terminal State

```

---

# A2 — ONE ACTIVE WRITER PRINCIPLE

```text
ONE ACTIVE WRITER AT A TIME

```

This principle applies to:

```text
All interdependent PRs

#204 / #206 chain

Any package.json overlap

Any pnpm-lock.yaml overlap

Any generated Task Catalog overlap

Any overlapping Task Contract scope

Any future overlapping write scope

```

A6 is the specific application of this principle to the Dependency chain.

---

# A3 — #205

If Live Evidence proves:

```text
#205 = CANONICAL_COMPLETE

```

then:

```text
DO NOT REOPEN
DO NOT REBUILD

```

---

# A4 — #204 CHAIN

If:

```text
SUPERSEDED
+
CLOSED_UNMERGED

```

then:

```text
DO NOT REOPEN

DO NOT MERGE OLD ARTIFACT

DO NOT REUSE OLD EVIDENCE

```

Discover the Replacement live.

---

# A5 — #206 CHAIN

Apply the same rule.

Do not hard-code any Replacement PR number from the Prompt.

---

# A6 — SERIAL CHAIN APPLICATION

For the Dependency chain:

```text
Runtime chain
→ CANONICAL_COMPLETE
→ then
NestJS chain begins/rebuilds from exact current main

```

If the Runtime chain is not complete:

```text
NestJS conflicting writer = PROHIBITED

```

---

# A7 — RISK CONTINUITY STATE MACHINE

Risk continuity values:

```text
SAME
ESCALATED
DOWNGRADED

```

## SAME

```text
Continue

```

## ESCALATED

```text
Apply all gates of higher risk
Continue

```

## DOWNGRADED

Immediately:

```text
STAGE_A = STOPPED_RISK_DOWNGRADE

Record:
RISK_DOWNGRADE_ALERT

```

Investigation:

```text
Deterministic Risk Evidence

Root Cause Analysis

Documented Justification

Owner Risk Review

```

If accepted and Replacement Risk remains >= deterministic minimum:

```text
RISK_DOWNGRADE_RESOLVED = PASS

Resume Stage A
from the exact stopped checkpoint

```

If rejected:

```text
STAGE_A = ABORTED

Record:
STAGE_A_ABORTED

Item 10 = NOT_STARTED

```

Silent continuation is prohibited.

---

# A8 — FINAL DEPENDENCY TABLE

```text
Original PR
Original State
Original Risk

Replacement PR
Replacement Base
Replacement Head
Replacement Risk

Risk Continuity

Artifact Hash

CI
Review
Security
Human Gate

Merge SHA
Post-Merge Run

Final Canonical State

```

---

# A9 — HIGH PRE-HUMAN VALIDATION

Before Human Approval:

```text
Head SHA = STABLE

Artifact Hash = STABLE

CI = PASS

Phase A = PASS

Scope = PASS

Lock = ACTIVE

Primary Review = PASS

Security = PASS

Protection = PASS

```

Then:

```text
HUMAN_PENDING

```

---

# A10 — POST-HUMAN PRE-MERGE VALIDATION

After Human Approval and immediately before Merge:

```text
TOCTOU Revalidation

```

At minimum:

```text
Head SHA

Base SHA

Artifact Hash

Lock = ACTIVE

CI still PASS

Review still valid

Security still valid

Protection still ACTIVE

Human Approval binding still valid

```

If Head or Artifact binding changed:

```text
Human Approval = STALE

```

If Base changed:

Section 24 applies.

---

# A11 — PROTECTED MERGE

Use only the Canonical Merge Transport.

Direct merge is prohibited.

---

# A12 — EXACT-SHA POST-MERGE

```text
Resolve exact Merge SHA

Checkout exact Merge SHA

Assert HEAD == Merge SHA

Frozen dependency install

pnpm verify

Phase A

Required deterministic verification

```

Only then:

```text
CANONICAL_COMPLETE

```

---

# A13 — STAGE A EXIT

```text
#205 chain = CANONICAL_COMPLETE

#204 chain = CANONICAL_COMPLETE

#206 chain = CANONICAL_COMPLETE

Blocking dependency PRs = 0

Overlapping active writer locks = 0

Pending Human Gates = 0

Accepted stale evidence = 0

Unresolved Post-Merge Failure = 0

Unresolved Risk Downgrade = 0

```

Then:

```text
DEPENDENCY_CLEANUP = PASS

```

---

# STAGE B

# ITEM 10 — V1 PRODUCTION GATE

Begin:

```text
only if DEPENDENCY_CLEANUP = PASS

```

---

# B1 — ITEM 10 SPEC DISCOVERY

Resolve the Canonical Item 10 Specification.

If it does not exist:

```text
ITEM10_SPEC = MISSING

STAGE_B = BLOCKED

MISSION = BLOCKED

```

Then:

```text
STOP

```

Root Cause:

```text
Was Item 10 ever defined?

Was it deleted?

Was it not migrated?

Is authoritative documentation inconsistent?

```

Owner Action:

```text
Provide existing canonical Item 10 specification

OR

Authorize governed creation of Item 10 specification

```

After canonical resolution:

```text
RESTART STAGE B FROM B1

```

Skipping is prohibited.

---

# B2 — TASK CONTRACT

Use only the Canonical Schema.

Generated files:

```text
Canonical generator only

```

Manual editing of generated documentation is prohibited.

---

# B3 — RISK

```text
DETERMINISTIC CLASSIFIER WINS

```

---

# B4 — MINIMUM COVERAGE

```text
Architecture

Workflow lifecycle

Full State Machine

Scope

Lock

Risk

Artifact binding

Evidence provenance

Authority separation

CI

Security

Human Gate

Merge Policy

Branch Protection

Bypass actors

Trusted integration identity

Token governance

Docs automation

Post-Merge

Fail-Closed behavior

```

---

# B5 — TOKEN CALIBRATION BOUNDARY

If Canonical Evidence still defers Quantitative Calibration to V1.1:

```text
Token Governance = VERIFIED

Quantitative Calibration =
DEFERRED_TO_V1_1

```

Prohibited:

```text
Synthetic telemetry

Invented telemetry

Estimated calibrated budget

```

---

# B6 — ITEM 10 EXIT

Only if:

```text
Task Contract = SATISFIED

Risk = VALID

Scope = PASS

Lock = VALID

Primary Review = PASS

Verification = PASS

CI = PASS

Security = PASS / N/A

Human Gate = PASS / N/A

Protection = PASS

Merge Policy = PASS

Protected Merge = PASS

Exact-SHA Post-Merge = PASS

```

then:

```text
ITEM_10 = CANONICAL_COMPLETE

```

---

# STAGE C

# V1 OPERATIONAL ACCEPTANCE

---

# 27. TEST SEMANTICS

## Positive Tests

```text
Test 1 — LOW
Test 2 — MEDIUM
Test 3 — HIGH

```

Success requires:

```text
Protected Merge

+

Exact-SHA Post-Merge PASS

```

## Negative / Control Tests

```text
Test 4 — Lock

Test 5 — Fail-Closed

Test 6 — Authority Separation

Test 7 — Protection Drift

```

A test-only unsafe artifact:

```text
MUST NOT MERGE TO MAIN

```

PASS means:

```text
BLOCKED_AS_EXPECTED

```

---

# 28. POSITIVE TASK SELECTION

Priority:

```text
1. Approved legitimate backlog task

2. Legitimate maintenance/hardening task

3. Bounded legitimate regression/safety improvement

```

Artificial features are prohibited.

If no suitable Task exists:

```text
NO_SUITABLE_TASK

```

Then:

```text
Affected Positive Test = BLOCKED

Affected Phase = BLOCKED

Final Acceptance = BLOCKED

```

No PASS and no synthetic workaround.

---

# PHASE 0

# FINAL SANITY

Verify:

```text
Mission Version

Mission Hash

main HEAD

Required Checks

Trusted Integration Identity

Ruleset

Branch Protection

Bypass Actors

Blocking Acceptance PRs = 0

Stale Locks = 0

Item 10 canonical ancestor = TRUE

```

Then:

```text
PHASE_0 = PASS

```

---

# PHASE 1

# CORE ACCEPTANCE

---

# TEST 1 — LOW

```text
MA-V1-ACC-LOW-001

```

Select a legitimate Task.

Risk must classify:

```text
LOW

```

Do not force classification.

---

# TEST 2 — MEDIUM

```text
MA-V1-ACC-MEDIUM-001

```

Select a legitimate Task.

Risk must classify:

```text
MEDIUM

```

Do not force classification.

---

# TEST 4 — LOCK CONFLICT

Test-only.

Coverage:

```text
Exact overlap

Prefix overlap

Nested overlap

Normalized collision

Traversal attempt

Foreign release

Valid terminal release

```

Expected:

```text
UNSAFE CONCURRENT WRITE
= PREVENTED

```

---

# TEST 5A — BROKEN TEST

Expected:

```text
Verification = FAIL

Merge = BLOCKED

```

---

# TEST 5B — ARTIFACT MUTATION

Test-only.

```text
Artifact V1
→ Hash V1
→ Test Approval

Artifact V2
→ Hash V2

```

Expected:

```text
Approval(Hash V1)
!=
ValidFor(Hash V2)

STALE_APPROVAL_DETECTED

Merge = BLOCKED

```

Production Evidence reuse is prohibited.

---

# TEST 5C — SCOPE VIOLATION

Expected:

```text
SCOPE_VIOLATION_DETECTED

WRITE_BLOCKED

MERGE_BLOCKED

```

---

# TEST 5D — FULL STATE MACHINE COVERAGE

Extract the Canonical State Machine from the Workflow Controller.

For the state set:

```text
S

```

and allowed transitions:

```text
T_allowed

```

evaluate all possible ordered pairs.

For every:

```text
(from,to)
∉ T_allowed

```

Expected:

```text
INVALID_TRANSITION
REJECTED

```

At least one complete valid lifecycle must also be:

```text
ACCEPTED

```

## Matrix Recording for 5D

Expected Negative Outcome:

```text
ALL ILLEGAL TRANSITIONS REJECTED

```

The detailed attachment/table must record for every illegal transition:

```text
FROM

TO

EXPECTED = REJECTED

ACTUAL

EVIDENCE

```

Actual Outcome may only be:

```text
BLOCKED_AS_EXPECTED
+
VALID_LIFECYCLE_ACCEPTED

```

if every illegal transition was rejected and the valid lifecycle was accepted.

---

# 29. TEST EVIDENCE ANTI-REPLAY

Test Evidence must be Machine-Distinguishable.

If the schema supports it:

```text
test_mode = true

test namespace

test Task ID

```

If not supported:

```text
Do not inject test evidence
into Production evidence transport

```

Use a deterministic test harness instead.

If Test Evidence can create Production merge eligibility:

```text
CRITICAL FAILURE

V1_ACCEPTANCE = BLOCKED

```

---

# PHASE 1 EXIT

```text
Test 1 = PASS

Test 2 = PASS

Test 4 = PASS

Test 5A = PASS

Test 5B = PASS

Test 5C = PASS

Test 5D = PASS

Fake PASS = 0

Bypass = 0

Unauthorized main write = 0

Unresolved scope violation = 0

Illegal transition accepted = 0

```

---

# PHASE 2

# ADVANCED TRUST

---

# TEST 3 — HIGH

```text
MA-V1-ACC-HIGH-001

```

Select a legitimate bounded HIGH Task.

Risk:

```text
HIGH

```

Before Owner Approval:

```text
HUMAN_PENDING

MERGE = BLOCKED

```

After Approval:

```text
Pre-Merge TOCTOU Revalidation

Protected Merge

Exact-SHA Post-Merge

```

---

# TEST 6A-1 — SELF-REVIEW

Use the real Evidence Transport.

Executor attempts to submit Review PASS.

Expected:

```text
UNAUTHORIZED_REVIEW_EVIDENCE

REJECTED

MERGE_BLOCKED

```

---

# TEST 6A-2 — SELF-VERIFICATION

Expected:

```text
UNAUTHORIZED_VERIFICATION_EVIDENCE

REJECTED

```

---

# TEST 6A-3 — HUMAN APPROVAL MISUSE

Attempt to use Owner Approval, in a test-only context, as:

```text
Review

Verification

Security

```

Expected:

```text
REJECTED

SEPARATE_AUTHORITIES_ENFORCED

```

---

# TEST 6B — NOT_EXECUTED

```text
Supplementary Review = PASS

Verification = NOT_EXECUTED

```

Expected:

```text
Final != PASS

Merge != READY

```

---

# TEST 7 — PROTECTION DRIFT

Fixture priority:

```text
Existing in-repo harness

Isolated deterministic harness

Mock config

Isolated branch

```

Never mutate live protection.

Simulate:

```text
Required check removed

Unexpected bypass actor

Force push enabled

Integration identity mismatch

```

Expected:

```text
DRIFT_DETECTED

MERGE_BLOCKED

```

If no safe seam exists:

```text
TEST_7 = BLOCKED

```

and governed testability remediation must be completed first.

---

# PHASE 2 EXIT

```text
Test 3 = PASS

Test 6A-1 = PASS

Test 6A-2 = PASS

Test 6A-3 = PASS

Test 6B = PASS

Test 7 = PASS

```

---

# PHASE 3

# CANONICAL CLOSURE

---

# 30. CANONICAL TEST-ARTIFACT RETENTION POLICY

Default:

```text
Open Test-Only PRs after Phase 3 = 0

```

Default cleanup:

```text
Test locks released

Test fixtures inactive

Test branches handled according
to canonical branch-retention policy

```

An exception is allowed only for a specific retention reason:

```text
Audit retention

V1.1 reference

Explicit governance requirement

```

Every exception must record:

```text
Specific PR

Reason

Owner

Review date

Retention end condition

```

Open-ended retention is prohibited.

---

# 31. RESIDUAL STATE CHECK

Before Closure:

```text
Active Acceptance Locks = 0

Open Test PRs = 0
unless explicitly retained by Section 30

Pending Test Evidence = 0

Test Approval affecting Production = 0

Active Test Fixtures = 0

Production Protection Drift = 0

Unresolved Post-Merge Failure = 0

```

---

# 32. ACCEPTANCE CLOSURE RECORD STORAGE

The Closure Record must be stored in the Canonical missions directory.

If an existing naming convention exists:

```text
EXISTING CONVENTION WINS

```

Fallback V1.5 name:

```text
docs/14-multi-agent/missions/
EQCOFE-MULTI-AGENT-V1.5-ACCEPTANCE-CLOSURE.md

```

Content:

```text
Mission Version

Mission Hash

Final main SHA

Phase 0 Result

Phase 1 Result

Phase 2 Result

Phase 3 Result

Evidence Matrix Reference

Closure PR

Closure Head SHA

Closure Merge SHA

Post-Merge Run

Closure UTC Timestamp

```

After Canonical Merge:

```text
ACCEPTANCE_RECORD_STATUS
= CANONICAL_CLOSED

```

Direct modification of the Record after Closure is prohibited.

Any correction requires a follow-up canonical record/amendment.

---

# 33. FINAL EVIDENCE MATRIX

Columns:

```text
Mission Version

Mission Hash

Task ID

Test Number

Risk

Risk Floor

Implementation Authority

Base SHA

Head SHA

Artifact Hash

Scope

Lock ID

PR Number

CI Run IDs

Primary Review Authority

Primary Review Evidence

Verification Authority

Verification Evidence

Transport Identity

Security Gate

Human Gate

Supplementary Reviewer

Merge Policy

Merge SHA

Post-Merge Run

Expected Negative Outcome

Actual Outcome

Terminal State

UTC Timestamp

```

## Positive Tests 1/2/3

```text
Expected Negative Outcome = N/A

Actual Outcome = SUCCESS

```

## Negative Tests 4/5/6/7

```text
Expected Negative Outcome =
specific required rejection/block

Actual Outcome =
BLOCKED_AS_EXPECTED

```

Test 5D must use the format defined in Section 28.

---

# 34. POST-MERGE FAILURE WORKFLOW

Every Post-Merge Failure must create a:

```text
POST_MERGE_FAILED

```

event.

Then create Investigation tracking.

If canonical automation already exists:

```text
USE EXISTING CANONICAL AUTOMATION

```

Otherwise, the Investigation Issue must include:

```text
Incident state

Source workflow/run

PR

Merge SHA

Failed verification

Severity

Owner

Root Cause placeholder

Impact placeholder

Remediation link

```

Owner/assignee must be resolved from the Verified Project Owner.

Labels may only be used if they already exist canonically.

---

## Severity — CRITICAL

Examples:

```text
Canonical build broken

Required verification reproducibly fails

Critical security/safety boundary broken

```

Action:

```text
Urgent Governed Revert or Remediation Task

```

But:

```text
NO AUTO-ROLLBACK

NO FORCE PUSH

NO RESET

```

A Revert still requires:

```text
New Task

Fresh Artifact

Fresh Gates

Protected Merge

```

---

## Severity — NON-CRITICAL

```text
Normal Governed Remediation

```

---

## Severity Unknown

```text
BLOCKED_PENDING_INVESTIGATION

```

Final Acceptance PASS is prohibited.

---

# 35. FINAL LIVE REVALIDATION TIME BOUND

Final Live Revalidation must occur:

```text
within 60 minutes
before Final PASS declaration

```

If more than 60 minutes have elapsed:

```text
REVALIDATE AGAIN

```

Revalidate:

```text
Mission Version

Mission Hash

main HEAD

Ruleset

Required Checks

Integration Identity

Bypass Actors

Blocking PRs

Active Locks

Post-Merge failures

Residual Test Evidence

Production Protection

```

---

# 36. COMPATIBILITY PROOF FOR AMENDMENTS

Evidence from a previous Mission version may only be reused through a Compatibility Proof.

Canonical Template:

```text
From Mission Version:
<old>

To Mission Version:
<new>

Old Mission Hash:
<hash>

New Mission Hash:
<hash>

Changes:
1. ...
2. ...

Impact Analysis:

Test 1:
UNAFFECTED / AFFECTED

Test 2:
UNAFFECTED / AFFECTED

Test 3:
UNAFFECTED / AFFECTED

Test 4:
UNAFFECTED / AFFECTED

Test 5:
UNAFFECTED / AFFECTED

Test 6:
UNAFFECTED / AFFECTED

Test 7:
UNAFFECTED / AFFECTED

Reusable Evidence:

<evidence>
VALID / INVALID

Reason:
...

Deterministic Validation:
PASS / FAIL

Artifact hashes unchanged where reuse claimed:
YES / NO

Required Re-runs:
...

Owner Amendment Sign-off:
PASS / PENDING

Supplementary Advisor Review:
PASS / N/A

Registry Entry:
<reference>

```

Compatibility Proof must be registered in:

```text
docs/14-multi-agent/missions/
AMENDMENTS-REGISTRY.md

```

or the existing canonical amendments registry.

Advisor Review remains Supplementary and is not a mandatory prerequisite.

Owner Sign-off is mandatory for Mission Amendments.

---

# 37. NO-WAIVER RULE

No Mandatory Failure can be converted to PASS by:

```text
Owner opinion alone

Executor opinion

Advisor opinion

LLM opinion

Manual assertion

Deadline pressure

Documentation-only explanation

```

The Owner has only the authorities explicitly granted by this Mission.

The Owner cannot convert a deterministic failure into PASS.

---

# 38. FINAL TRUST CONDITIONS

`PRODUCTION TRUSTED` has exactly the scope defined in Section 2.

Conditions:

```text
Mission Spec = FROZEN

Mission Hash = VERIFIED

Trusted Transport Model = RESOLVED

Provenance Capabilities P1-P4 = PASS

Dependency Cleanup = PASS

Item 10 = CANONICAL_COMPLETE

Phase 0 = PASS

Phase 1 = PASS

Phase 2 = PASS

Phase 3 = PASS

Positive Flows = PASS

Negative Flows = PASS

Full State Machine Negative Coverage = PASS

Test Evidence Isolation = PASS

Fake PASS = 0

Bypass = 0

Unauthorized Main Write = 0

Accepted Stale Evidence = 0

Accepted Test Evidence in Production = 0

Accepted Self-Review = 0

Accepted Self-Verification = 0

HIGH Merge Without Owner = 0

Illegal Transition Accepted = 0

Unresolved Risk Downgrade = 0

Unresolved Scope Violation = 0

Production Protection Mutation = 0

Residual Acceptance Lock = 0

Unresolved Post-Merge Failure = 0

All required positive merges
have Exact-SHA Post-Merge PASS

```

Only then:

```text
V1_OPERATIONAL_ACCEPTANCE = PASS

```

and, within the scope of Section 2:

```text
EQCOFE MULTI-AGENT V1
= PRODUCTION TRUSTED

```

---

# 39. FINAL OWNER REPORT

```text
════════════════════════════════════════
EQCOFE MULTI-AGENT V1
FINAL OPERATIONAL ACCEPTANCE
════════════════════════════════════════

Mission Version:
V1.5

Mission Hash:
<HASH>

Mission Specification:
FROZEN

Acceptance Record:
CANONICAL_CLOSED / NOT_CLOSED

Canonical Main:
<SHA>

Final Live Revalidation:
<PASS / FAIL>
<TIMESTAMP UTC>

----------------------------------------

Dependency Cleanup:
PASS / FAIL / BLOCKED

Item 10:
PASS / FAIL / BLOCKED

Phase 0:
PASS / FAIL / BLOCKED

Phase 1:
PASS / FAIL / BLOCKED

Phase 2:
PASS / FAIL / BLOCKED

Phase 3:
PASS / FAIL / BLOCKED

----------------------------------------

Test 1 LOW:
PASS / FAIL / BLOCKED

Test 2 MEDIUM:
PASS / FAIL / BLOCKED

Test 3 HIGH:
PASS / FAIL / BLOCKED

Test 4 Lock:
PASS / FAIL / BLOCKED

Test 5 Fail-Closed:
PASS / FAIL / BLOCKED

Test 6 Authority Separation:
PASS / FAIL / BLOCKED

Test 7 Protection Drift:
PASS / FAIL / BLOCKED

----------------------------------------

Trusted Transport:
RESOLVED / UNRESOLVED

Provenance P1-P4:
PASS / FAIL / BLOCKED

Primary Review:
CI + Deterministic

Supplementary Review:
Advisor / N/A

Human Gate:
Owner / N/A

----------------------------------------

Fake PASS:
0 required

Bypass:
0 required

Unauthorized main writes:
0 required

Accepted stale evidence:
0 required

Accepted test evidence in Production:
0 required

Accepted self-review:
0 required

Accepted self-verification:
0 required

HIGH merge without Owner:
0 required

Illegal lifecycle transition:
0 required

Unresolved risk downgrade:
0 required

Unresolved scope violation:
0 required

Production protection mutation:
0 required

Residual Acceptance locks:
0 required

Unresolved Post-Merge failures:
0 required

----------------------------------------

Quantitative Token Calibration:
PASS / DEFERRED_TO_V1_1 / N/A

----------------------------------------

V1_OPERATIONAL_ACCEPTANCE =
PASS / FAIL / BLOCKED

```

---

# 40. ABSOLUTE EXECUTION ORDER

```text
Mission Draft V1.5
        ↓
Canonical Registration
        ↓
Mission SHA-256
        ↓
Governance Registration
        ↓
MISSION_SPEC = FROZEN
        ↓
Owner Identity Resolution
        ↓
Trust Model Resolution
        ↓
Live Baseline Verify
        ↓
Stage A Dependency Cleanup
        ↓
#204/#205/#206 Chains Closed
        ↓
Stage A PASS
        ↓
Item 10 Spec Discovery
        ↓
Item 10 Execution
        ↓
Item 10 CANONICAL COMPLETE
        ↓
Phase 0 Final Sanity
        ↓
Phase 1 Core Acceptance
        ↓
Phase 2 Advanced Trust
        ↓
Phase 3 Closure
        ↓
Residual State Check
        ↓
Final Live Revalidation
        ↓
Closure PR
        ↓
Exact-SHA Post-Merge
        ↓
Acceptance Record CANONICAL_CLOSED
        ↓
Final Owner Report
        ↓
PRODUCTION TRUSTED

```

---

# 41. FINAL AMENDMENT RULE

After Freeze:

```text
NO SILENT CHANGE

```

Every change requires:

```text
New Version

New Hash

Reason

Impact Analysis

Compatibility Proof

Canonical Registration

Owner Amendment Sign-off

```

Affected Tests:

```text
MUST BE RE-RUN

```

unless a valid Compatibility Proof machine-verifiably proves that they are unaffected.

---

# 42. ABSOLUTE FINAL QUESTION

Before Final PASS, the following question must be answered using Machine-Verifiable Evidence:

> If the Project Owner submits a real and authorized V1 Task to EQCOFE Multi-Agent right now, can the system—without trusting assertions from the Executor, Agent, Advisor, or LLM—validly identify the Owner and Trusted Transport; correctly classify the Task; distinguish Evidence provenance; Fail-Closed on risk downgrade; enforce Scope and Lock; reject every illegal State Machine transition; deterministically bind the Exact Artifact; bind Review, Security, and Human Approval to the correct Artifact; detect Head and Base drift before Merge; reject Self-Review and Self-Verification; isolate Test Evidence from Production Evidence; accept Human Approval only in `HUMAN_PENDING`; prevent HIGH Risk merge without Owner approval; detect Ruleset/Bypass Drift without modifying Production; handle Post-Merge Failure through governed remediation; and independently verify every valid Merge against the Exact Merge SHA?

Only if the answer is:

```text
YES

```

and all Section 38 Conditions PASS:

```text
V1_OPERATIONAL_ACCEPTANCE = PASS

EQCOFE MULTI-AGENT V1
= PRODUCTION TRUSTED

```

may be declared.

Otherwise:

```text
FINAL PASS = PROHIBITED

```

---

# 43. FINAL PRE-FREEZE DECLARATION

To convert this document from Candidate to Canonical Frozen Mission, the following must be recorded:

```text
Mission Version = V1.5

Advisor Final Audit = COMPLETE

Advisor Final Findings = 22

Advisor Findings Closed = 22 / 22

Outstanding Structural Issues = 0

Outstanding Critical Issues = 0

Outstanding Known Interpretation Issues = 0

Mission Content = BYTE-FROZEN

Mission Hash = REGISTERED

Governance Registration = COMPLETE

```

Only then:

```text
MISSION_SPEC_STATUS = FROZEN

```

and Stage A is authorized to begin.