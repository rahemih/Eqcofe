# EQCOFE — Step 65-G Wholesale UX Hardening

**Task:** `EQCOFE-STEP65-G-WHOLESALE-UX-HARDENING-001`  
**Risk:** MEDIUM  
**Human Gate:** NOT REQUIRED  
**Canonical base:** `a460b7c482f6d13609d70fd1f81ba56b186b6a74`  
**Linear:** HOS-69

## Goal
Harden Wholesale introduction/application/status plus approved Product/Cart/Checkout/Order presentation for Persian RTL, accessibility, responsive/reflow and explicit state semantics without changing commerce authority.

## Audit findings
- Direct Wholesale surfaces already use logical RTL and 44px controls, but no dedicated 65-G cross-surface verifier exists.
- Application submission changes button copy but does not expose an explicit live busy announcement.
- Long Persian copy and LTR identifiers require explicit overflow/reflow hardening at narrow widths and 400% zoom.
- Approved Wholesale Product/Cart/Checkout/Order state is already server-authoritative; only presentation semantics may change.

## Changes
- explicit `aria-busy` and live status/error semantics;
- stable LTR identifier isolation;
- overflow-safe Persian copy;
- explicit 320/360/600/840/1200/1440 and 400% reflow CSS coverage;
- inherited 44px touch targets and visible focus rings retained;
- deterministic `wholesale-ux-hardening:verify` added to Storefront verify.

## Non-goals
No Backend, OpenAPI, database, Pricing, Customer, Inventory, Payment, Order state-machine, dependency or Product Design semantic mutation.

## Closure
Exact-artifact Review + Lock, Canonical CI + Phase A, protected merge, exact-SHA postmerge Canonical CI/Phase A and terminal Lock release. No Owner Human Gate.
