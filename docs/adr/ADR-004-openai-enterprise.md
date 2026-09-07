# ADR-004: OpenAI enterprise LLM

- Status: Accepted
- Date: 2026-09-07

## Decision

Use OpenAI enterprise API with zero-retention/no-training contract assumed for MVP. Vertex flagged as swap-compatible via context builders.

## Consequences

- No provider-specific tools in counselors
- Separate A/B calls; builders assemble allowlists only
