# EQCOFE — CURRENT STATE

> **Canonical status snapshot**
>
> **Date:** 2026-08-19
> **Time:** 01:29 (UTC-07:00)
> **Snapshot ID:** `EQCOFE-CANONICAL-STATE-2026-08-19T01-29-07`

## Trust rule

This document records only facts verified from the connected GitHub repository and Google Drive evidence at the timestamp above. Historical claims that have not yet been re-verified on the official remote are explicitly marked `INHERITED_EVIDENCE` or `UNVERIFIED`.

## Repository

- Official repository: `rahemih/Eqcofe`
- Default branch: `main`
- Repository role: `OFFICIAL TARGET / CONSOLIDATION IN PROGRESS`
- Historical repository: `rahemih/digikala-clone`
- Historical repository policy: retain unchanged until migration and verification are complete.

## Current Git state

- Current observed `main` HEAD before this documentation snapshot: `d27d4f2cdb63fb96ff8d260808572f63e9bf7a88`
- HEAD message: `Diagnose Drive canonical package integrity`
- Observed branches: `main`, `canonical-import-payload`, `canonical-import-trigger`
- Full Step-44 application tree on official `main`: `NOT YET VERIFIED`

## Canonical package evidence

Google Drive contains:

- `Eqcofe-canonical-import-v1.zip`
  - File ID: `1bWR6xn1_uFHjhPxuRQVsZXBd4NTR9sjy`
  - Observed size: `1,209,500 bytes`
- `Eqcofe-canonical-import-v1.bundle`
  - File ID: `1XbFoV4pC7ig2JrZOzkYhQsqKzUdfCnqr`
  - Observed size: `749,548 bytes`
- `EQCOFE_CANONICAL_REPOSITORY_REPORT.md`

The Drive report records a prepared canonical repository through Step 44 with 782 tracked files. That package is currently the strongest canonical-source candidate, but its complete import onto official `main` must still be verified before remote canonicalization is declared PASS.

## Project position

- Last historically recovered completed step: **Step 44 — Comprehensive Notification System**
- Status of Step 44 on historical canonical artifact: `COMPLETE / INHERITED_EVIDENCE`
- Status of Step 44 on official remote `main`: `UNVERIFIED`
- Next planned development step: **Step 45 — Articles, Content & SEO**
- Development gate: **FROZEN pending consolidation verification**
- Active consolidation action: verify/import canonical Step-44 source, then run fresh build/test/CI baseline.

## Step-history confidence

- Steps 1–27: `UNVERIFIED`
- Step 28: `PARTIAL`
- Steps 29–44: `COMPLETE / INHERITED_EVIDENCE`, pending remote-source re-verification
- Step 45+: `NOT STARTED` unless later repository evidence proves otherwise

## Business decisions already supported by recovered canonical evidence

- Money unit: Toman
- Wallet: removed / not part of product
- Architecture lineage: TypeScript/Node modular monolith with PostgreSQL, Kysely, API/Worker/Scheduler, OpenAPI and outbox/inbox patterns

These remain subject to the final no-omission/conflict audit against all recoverable project sources.

## Build / Test / CI

- Fresh build on current official `main`: `NOT VERIFIED`
- Fresh runtime regression on current official `main`: `NOT VERIFIED`
- Fresh CI on current official `main`: `NOT VERIFIED`
- Inherited Step-44 evidence records: build 0 errors, runtime regression 127/127 PASS, OpenAPI 513 paths / 582 operations / 1138 refs PASS, architecture gate 345 files PASS, PostgreSQL 18.4 isolated verification PASS.
- Rule: inherited evidence is not presented as a fresh verification of the current remote tree.

## Open launch/consolidation blockers

1. Verify integrity and contents of the canonical Drive package against recorded hashes/evidence.
2. Verify or complete import of the full Step-44 source tree into the official repository.
3. Run fresh Node 24 / pnpm verification on the official canonical tree.
4. Run GitHub Actions CI and record the run evidence.
5. Reconstruct/verify Steps 1–28 as far as evidence permits; unresolved items remain in the UNVERIFIED register.
6. Canonicalize roadmap, master reference, business rules, decisions, traceability, step ledger and launch checklist.

## Next action

**Do not begin Step 45 yet.** First complete canonical source verification/import and establish a fresh build/test/CI baseline on `rahemih/Eqcofe`.

## Reliability

**Current-state reliability: HIGH for repository/Drive observations; MEDIUM for inherited Step-44 runtime evidence; LOW/UNVERIFIED for unrecovered early-step definitions.**

This document must be updated whenever a material verification result, canonical import, Step closure, branch/HEAD change, or build/test/CI baseline changes the project state.
