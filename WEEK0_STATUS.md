# Week-0 Status

Scaffold complete at /workspace/couples-coach.

## Created

- Hygiene: README, LICENSE, SECURITY.md, PRIVACY.md, CODEOWNERS, CI, .env.example
- docs/adr ADR-001..008 Accepted
- db/migrations/0001_identity_relationship.sql
- prompts/redteam + copy seeds
- packages: shared, context-builders, consent-gateway, session-orchestrator
- apps: web (3 tabs), api (/health)
- tests: allowlist + log-field guard

## How to run tests

Use the root package script named test (see package.json).

## Notes

- No real LLM calls or live IdP/billing integrations
- No joint-session code
- Local scaffold for later hand-off

## Path

/workspace/couples-coach

## File count

58 scaffold files excluding node_modules

## Test command

    npm test
