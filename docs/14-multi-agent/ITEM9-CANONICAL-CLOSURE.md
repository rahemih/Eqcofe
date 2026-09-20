# EQCOFE Multi-Agent — Item 9 Canonical Closure

## Status

Item 9 — **Calibration per risk class** becomes **CANONICAL CLOSED / FINAL PASS** only after this Stage D closure synchronization itself merges through the protected canonical path and its exact-SHA post-merge verification succeeds.

This closure does not fabricate missing telemetry, does not change any token budget, retry/repair limit, risk class, verification gate or runtime behavior, and does not start Item 10. After this closure becomes canonical, Item 10 — **V1 Production Gate** — is **AUTHORIZED / NOT STARTED**.

## Canonical implementation evidence

### Stage A — Evidence & Sample Sufficiency Baseline

- Task: `MA-ITEM9-CALIBRATION-A-001`
- PR: `#193`
- reviewed head: `cef527969d4bcdd3b59d2747f37dbc342bb348c6`
- artifact hash: `5dda5b0583df7c85c09a6f6e9af43f7ef07f1e1e10cd29a53cedc82392684504`
- protected merge run: `35435491785`
- canonical merge SHA: `5db790c74f601c23819df943beffbff7f106f9d3`
- exact-SHA post-merge verification: PASS
- disposition: `INSUFFICIENT_CANONICAL_TELEMETRY`

### Stage B — Deterministic Calibration Engine

- Task: `MA-ITEM9-CALIBRATION-B-001`
- PR: `#195`
- reviewed head: `0271ee2ad2ef3e123f71a216e813d28552a3a255`
- artifact hash: `04cbc77de47e77730aabc99594d8514d25c7769dc5d594c02da94163ffee06d8`
- protected merge run: `35437490690`
- canonical merge SHA: `e79d7397d54545a8c3620961df4cc0df666ff9d5`
- exact-SHA post-merge canonical verify: PASS
- exact-SHA post-merge Phase A: PASS
- multi-agent: `131/131 PASS`
- full project: `913/913 PASS`
- Phase A database integrity and Steps 01–28: PASS

### Stage C — Risk-Class Recommendations

- Task: `MA-ITEM9-CALIBRATION-C-001`
- PR: `#196`
- reviewed head: `a7d7b53b3c5b375b53d0701af060e6cea3a0963f`
- artifact hash: `168fb7be9e61ff9499083dc1e375796392a3439e44085827070dfad93dfa82d4`
- protected merge run: `35438559717`
- canonical merge SHA: `00a1bd3498f4e044cabdbbabceb2dd57f2d5e3d2`
- exact-SHA post-merge canonical verify: PASS
- exact-SHA post-merge Phase A: PASS
- multi-agent: `141/141 PASS`
- full project: `913/913 PASS`
- Phase A PostgreSQL integrity and Steps 01–28: PASS

## Stage D baseline

Stage D starts from exact canonical `main`:

`8f17364fc7c27dc30de5845c1af467b1215d1351`

This baseline includes terminal Step 58-H / Step 58 final canonical closure and remains green:

- Step 58-H PR #201 merge SHA: `8f17364fc7c27dc30de5845c1af467b1215d1351`
- Step 58-H protected merge run `35490799957`: SUCCESS
- exact-SHA post-merge canonical verify: PASS
- exact-SHA post-merge Phase A: PASS
- Multi-Agent postmerge: `141 total / 140 PASS / 0 FAIL / 1 expected non-PR environment-gated skip`
- full project: `913/913 PASS`
- inherited terminal merged-main Storefront Quality run `35490356922`: SUCCESS
- canonical committed telemetry paths under `.eqcofe/telemetry/`: **0**

These are baseline facts only. Stage D still requires its own exact-head CI, Review, Lock, protected merge and exact-SHA post-merge verification.

## Final calibration state

| Risk | Canonical primary samples | Minimum | Token budget | Retry / repair | Risk / gates |
| --- | ---: | ---: | --- | --- | --- |
| LOW | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |
| MEDIUM | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |
| HIGH | 0 | 10 | NO_NUMERIC_RECOMMENDATION | NO_NUMERIC_RECOMMENDATION | NO_CHANGE |

The current absence of canonical telemetry is evidence of **insufficiency**, not zero usage. No Pilot budget is reinterpreted as a calibrated budget.

Stage B's threshold remains a conservative operational floor of 10 primary samples per risk class; it is not a statistical-confidence claim.

Stage C remains advisory-only:

- `automatic_apply=false`
- `policy_mutation_allowed=false`
- any future policy mutation requires a separate governed task
- retry/repair remains non-numeric until an explicit canonical distribution exists
- risk floors and Review/Security/Human/Merge gates cannot be relaxed by calibration

## V1.1 follow-up

The Project Owner directs quantitative **Calibration V2 / recalibration** to V1.1 because V1 does not yet contain sufficient canonical primary telemetry.

The follow-up may produce quantitative recommendations only after the evidence requirements are actually satisfied, including at least the existing minimum primary-sample rule per risk class and explicit canonical retry/repair evidence where a retry/repair recommendation is desired.

This deferral is not permission to estimate missing usage and is not permission to mutate V1 policy.

## Artifact-preservation rule

Stage D does not rewrite the reviewed implementation artifacts:

- `MA-ITEM9-CALIBRATION-A-001.json`
- `MA-ITEM9-CALIBRATION-B-001.json`
- `MA-ITEM9-CALIBRATION-C-001.json`
- calibration engine/recommendation scripts
- their tests

Terminal closure evidence is recorded separately in this document and `MA-ITEM9-CALIBRATION-FINAL-CLOSURE-001`.

## Frozen sequencing after Item 9 closure

The frozen implementation order remains unchanged:

- Items 1–8 — CANONICAL COMPLETE
- Item 9 — **CANONICAL CLOSED / FINAL PASS** only after this closure task's protected merge and exact-SHA post-merge PASS
- Item 10 — **AUTHORIZED / NOT STARTED** only after that terminal Item 9 closure
- Item 10 execution requires its own Task Contract, scope, risk classification, verification and protected canonical merge controls

Authorization is not execution.
