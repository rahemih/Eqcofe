# Testing and Verification

Primary local gate:

```bash
pnpm verify
```

This runs contract validation, architecture policy, project policy, build and tests.

Latest verified full runtime result on final Step-44 production-source lineage: **127/127 PASS** on Node 24.18.1 / TypeScript 6.0.3. Step 44 additionally closed with a 52-check source/security gate, 10/10 repeated cycles (520/520), 58/58 final audit and PostgreSQL 18.4 negative/concurrency-protection gates.

The canonical import itself does not fabricate a fresh Node-24 run when the current execution environment lacks dependencies. CI should reproduce `pnpm install --frozen-lockfile && pnpm verify`.
