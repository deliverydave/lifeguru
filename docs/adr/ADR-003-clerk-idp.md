# ADR-003: Clerk as IdP

- Status: Accepted
- Date: 2026-09-07

## Decision

Use Clerk as the identity provider for MVP (MFA, invite-friendly, OIDC to API).

## Consequences

- Webhook user.created provisions Person + Map (also provisioned on first authenticated request)
- Opaque person_id in counseling domain
- M1 implements Clerk JWT verification in `apps/api` and Clerk.js UI in `apps/web` (see [docs/M1.md](../M1.md))
