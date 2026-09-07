# ADR-009: M0 thin-slice privacy prototype

- Status: Accepted
- Date: 2026-09-07

## Decision

Ship a clickable private-session slice with deterministic orchestration, an
allowlisted context builder as the sole assembler, a mock counselor (no live
LLM), and owner-scoped in-memory sessions. Extend Week-0 ADRs/CI; do not replace
them. Details and threat model v1: [docs/M0.md](../M0.md).

## Consequences

- No joint sessions (ADR-008)
- No agent swarms (ADR-001)
- Default share decision remains KEEP (consent-gateway)
- Dual CODEOWNERS still apply to context-builders and consent-gateway
