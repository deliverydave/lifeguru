# ADR-005: Nightly abstract activation

- Status: Accepted
- Date: 2026-09-07

## Decision

Activate consented abstracts on a nightly batch window, not in real time. Privacy over freshness.

## Consequences

- No mid-evening theme appearance after a session
- Cloud Scheduler job for activation
- Abstracts inactive until batch runs
