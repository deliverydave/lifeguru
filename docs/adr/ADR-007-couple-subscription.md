# ADR-007: Couple subscription + cancel grace

- Status: Accepted
- Date: 2026-09-07

## Decision

One relationship = one couple subscription. Either partner can cancel. Shared plane freezes after a 7-day grace. Private history retained for account owner until account delete.

## Consequences

- Billing attaches to relationship_id
- Stripe integration deferred; env example only in Week-0
- Price TBD
