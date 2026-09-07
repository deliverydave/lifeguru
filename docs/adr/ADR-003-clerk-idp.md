# ADR-003: Clerk as IdP

- Status: Accepted
- Date: 2026-09-07

## Decision

Use Clerk as the identity provider for MVP (MFA, invite-friendly, OIDC to API).

## Consequences

- Webhook user.created provisions Person + Map
- Opaque person_id in counseling domain
- Env examples only in Week-0; no live integration yet
