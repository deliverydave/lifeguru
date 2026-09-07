# ADR-002: Hybrid retention (N=14)

- Status: Accepted
- Date: 2026-09-07

## Decision

Retain raw transcript for 14 days, then hard-delete after user-approved summary/memories. Users may delete raw sooner via Privacy Mode or My Data.

## Consequences

- TTL delete worker required
- Default is hybrid, not immediate delete
