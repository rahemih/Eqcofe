# Legacy Repository Recovery — `rahemih/digikala-clone`

## Result

The legacy repository confirms that EQCOFE work existed before the aggregate import into `rahemih/Eqcofe`, but it does **not** recover reliable numbered provenance for Steps 01–28. It therefore strengthens repository-lineage evidence without changing any Step classification in the audit matrix.

## Scope and method

- Mirrored every advertised branch and all reachable Git objects from the private legacy repository.
- Inspected all 168 reachable commits, branch names, commit subjects, file paths, issues, pull requests, workflow runs, recovery documents, and recovery payload variants.
- Checked the object database with `git fsck`; no unreachable object was available for recovery.
- Searched for Step 01–28 identifiers and per-Step historical records. Explicit numbered history begins at Step 38; no attributable Step 01–28 commit, branch, tag, PR, issue, or document was found.
- Kept the canonical truth boundary at `rahemih/Eqcofe:main`; the legacy repository is supporting historical evidence only.

## Positive lineage evidence

- `rahemih/digikala-clone` was created on 2025-05-12, before `rahemih/Eqcofe` received its aggregate source import on 2026-08-19.
- The legacy branch `Eqcofe-02` contains an EQCOFE source subset and explicit Step 42/43-era work.
- Comparing that branch with Eqcofe import commit `b239dfe825b615f36caf2e26cc7abc80c70d349c` found 60 shared paths: 48 byte-identical Git blobs and 12 paths changed by the import. Examples of identical content include customer contracts, migrations `0026` and `0027`, customer/catalog source, and Step 42 audit scripts.
- Legacy PR 7 states that the official `rahemih/Eqcofe` repository contains the verified Step-44 canonical source. This supports the transfer narrative, but is not independent proof of Steps 01–28 numbering.

## Recovery payload finding

Every recovery payload version reachable anywhere in the legacy Git history was tested:

- 168 commits inspected.
- 16 unique payload sets found across `.eqcofe-current`, `.eqcofe-step38-artifact`, `.eqcofe-ci`, `.eqcofe-c7`, and `.eqcofe-final-src`.
- 0 payloads reconstructed successfully.
- The XZ candidates are truncated; `.eqcofe-final-src` is invalid Base64. Direct ZIP candidates are also truncated or invalid.

This local result is independently corroborated by GitHub Actions:

- Run [31885458279](https://github.com/rahemih/digikala-clone/actions/runs/31885458279) failed with `Unexpected end of input` while reconstructing the Step 38 artifact.
- Run [31885487861](https://github.com/rahemih/digikala-clone/actions/runs/31885487861) tested the candidate set and reported no complete safe source artifact.
- Issue [#6](https://github.com/rahemih/digikala-clone/issues/6) records the same recovery blocker.
- Two large runtime artifacts from runs 31845399761 and 31950279450 existed, but GitHub marks both expired. They were dependency/runtime bundles, not durable Step 01–28 provenance records.

## Historical decision

The legacy repository makes it credible that project development preceded the Eqcofe aggregate import and provides content continuity for later Steps. It does not establish which feature belonged to which numbered Step from 01 through 28. Accordingly:

- Steps 01–27 remain `UNVERIFIED` for Historical Attribution.
- Step 28 remains `PARTIAL` for Historical Attribution based on the already documented OpenAPI lineage evidence.
- Current Canonical Verification classifications remain unchanged.
- No code remediation is justified: the remaining gap is missing historical provenance, not a defect that can be honestly repaired in current source.
