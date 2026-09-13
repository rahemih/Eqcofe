# Step 57 review prototype

Status: IN PROGRESS; not a frozen implementation baseline.

This isolated design artifact covers navigation to 37 storefront and 97 admin obligations. Source-derived admin views are review scaffolding; route coverage does not establish visual or interaction approval. The selected second image governs the catalog at `/`.

Run `npm ci` then `npm run dev -- --host 127.0.0.1 --port 8772`. Run `npm run build` for the local static build. No service credentials or production API are used. The package is isolated from the application workspace; its dependencies are prototype tooling only.

Review routes: `/review`, `/flows`, `/admin?id=AD-B-03`, `/store?id=SF-B-01`. Catalog recovery states are listed in `/scenarios.html`.

`public/selected-reference.png` preserves the user-selected direction. `public/sample-grinder.png` is a generated, unbranded fictional sample, not verified product photography. Persian-first RTL, local Vazirmatn, integer Toman, no wallet, no brown, and inherited execution restrictions remain mandatory.

All mutations are local simulations. Payment, authorization, refunds, wholesale approval, uploads and persistence are not connected. Figma is optional.

Remaining release gates: domain-specific refinement, complete visual and interaction review, accessibility review at six inherited widths, frozen artifact approval, exact-head CI, merge and post-merge CI. Step 58 is not started.
