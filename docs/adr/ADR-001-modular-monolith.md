# ADR-001 — Modular Monolith

**Status:** Accepted

EQCOFE starts as a modular monolith. Domain boundaries are enforced in code and database ownership, while cross-domain workflows use ports/events/process managers. Microservices are deferred until an operational need justifies extraction.
