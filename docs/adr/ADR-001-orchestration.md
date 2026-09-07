# ADR-001: Orchestration + context builders

- Status: Accepted
- Date: 2026-09-07

## Decision

Use deterministic session orchestration plus role-bound LLM calls with hard context builders. Do not use autonomous multi-agent tool loops.

## Consequences

- Context builders are the privacy enforcement point for LLM I/O
- No fetch_partner tools on counselors
- Dual CODEOWNERS review on context-builders
