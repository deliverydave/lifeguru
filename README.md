# couples-coach

Privacy-first AI couples coaching monorepo.

Hand-off target: https://github.com/deliverydave/lifeguru
(local scaffold only — do not require GitHub auth here).

## Product stance

- Two private AI counselors + consent gateway
- Deterministic orchestration (no agent swarms)
- No auto-abstract; Keep / Abstract / Explicit; default Keep
- Symmetric packs; no joint sessions in V1
- Coaching-only not therapy; US-first
- Clerk IdP; OpenAI enterprise; 14-day hybrid retention; nightly abstracts

## Layout

- apps/web
- apps/api
- packages/*
- docs/adr
- db/migrations

## M0 demo

Clickable private counseling session. Counselor replies come from **Anthropic Claude** when a key is set; otherwise a local mock.

```bash
npm install

# Optional — real Claude replies (never commit this file)
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
# optional: ANTHROPIC_MODEL=claude-sonnet-4-20250514

# terminal 1 — in-memory session store (restart after changing the key)
npm run dev:api

# terminal 2 — Next app (JS/JSX). Proxies /v1/* to the API.
npm run dev:web
```

Open http://localhost:3000/counselor

- With `ANTHROPIC_API_KEY` set and the API restarted, chat should respond to what you actually said (stage still owned by the orchestrator).
- Without a key, `GET /health` shows `"counselor":"mock"` and replies stay local.
- Default model: `claude-sonnet-4-20250514` (override with `ANTHROPIC_MODEL`)
- Every Claude call is built only from the owner allowlist. Partner-private fields never enter the prompt.
- Web is JS/JSX only (no `tsconfig.json`) so Next does not run the Week-0 TypeScript verify crash
- **My Counselor** — stage indicator, turns, send box, Claude or mock replies, coaching disclaimer, Keep-private default
- **Our Relationship** / **My Data** — stubs with working nav links
- Dev `person_id`: `person_a` or `person_b` (header `X-Person-Id`). Cross-fetch is forbidden.
- Store: in-memory (reset on API restart). Optional: `M0_STORE_PATH=./data/m0-store.json npm run dev:api`
- Threat model + run notes: [docs/M0.md](docs/M0.md)

```bash
npm test
```

API (owner-scoped):

- `POST /v1/sessions`
- `GET /v1/sessions/:sessionId`
- `POST /v1/sessions/:sessionId/turns` `{ "text": "..." }`
- `POST /v1/sessions/:sessionId/advance`
- `POST /v1/sessions/:sessionId/share` (no-op stub, stays KEEP)
