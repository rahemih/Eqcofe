# Issue Migration / Reconstruction Plan

Existing `rahemih/digikala-clone` issues were reviewed as historical input; they are not blindly copied as active issues.

| Old issue | Classification in canonical repo | Rationale |
|---|---|---|
| #1 Step38 Node24 build/regression | SUPERSEDED / RESOLVED BY LATER EVIDENCE | Later Steps progressed with exact Node24 evidence and current Step44 source lineage has 127/127 runtime regression on Node 24.18.1. |
| #2 Step38 PostgreSQL18 migration/concurrency | SUPERSEDED / RESOLVED BY LATER EVIDENCE | Later Step38+ PostgreSQL gates and subsequent DB concurrency audits passed. |
| #3 Select/integrate Iranian PSP | FUTURE VALID WORK — map to Step47/Step62, not Step38 blocker | Live-provider integration remains intentionally deferred/fail-closed. |
| #4 Verify real PSP refund semantics | FUTURE VALID WORK — map to real-service E2E gate | Keep as launch/real-provider validation, not a claim that generic payment core is incomplete. |
| #5 PostHog instrumentation | LAUNCH-PREFERRED / PRODUCTION OBSERVABILITY BACKLOG | Valid future analytics work; do not activate payment flags as a substitute for backend safety. |
| #6 Recovery blocker: incomplete Step38 artifact | SUPERSEDED / RESOLVED | Canonical source was later recovered from verified artifacts through Step44. |

If/when the new remote GitHub repository is created, create only the still-valid future tasks (#3/#4/#5 equivalents) with updated Step ownership and provenance. Historical resolved issues belong in documentation, not as misleading open blockers.
