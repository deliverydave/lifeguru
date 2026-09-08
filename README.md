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

## M1 demo

Two real humans: sign up, accept disclaimers, create/join a relationship, private counselors only.

### Clerk dashboard (human must do this)

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. API keys → copy **Publishable key** and **Secret key** into a local `.env` (never commit it):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=`
   - `CLERK_SECRET_KEY=`
3. Configure paths / redirect URLs (development):
   - `http://localhost:3000/sign-in`
   - `http://localhost:3000/sign-up`
   - `http://localhost:3000/onboarding` (after sign-in / sign-up)
   - `http://localhost:3000` (app home)
4. Optional webhook: endpoint `http://localhost:3001/v1/webhooks/clerk` (needs a public tunnel). Events: `user.created`. Signing secret → `CLERK_WEBHOOK_SECRET=`. **Not required for local demo** — the first authenticated `/v1` request provisions `person_id`.
5. Create two users (or use Clerk’s sign-up twice in two browsers / two profiles).

### Run

```bash
npm install
cp .env.example .env
# set the Clerk keys above; optional ANTHROPIC_API_KEY for live Claude
# INVITE_BASE_URL=http://localhost:3000

# terminal 1
npm run dev:api

# terminal 2
npm run dev:web
```

Open http://localhost:3000

1. **Human A** — Sign up → accept privacy + coaching-not-therapy → **Our Relationship** → Create relationship → Generate invite link → Copy.
2. **Human B** — Sign up in a second browser → accept disclaimers → open the invite URL (`/join?token=…`) → Accept invite.
3. Each opens **My Counselor**. You should see your relationship id and member count. Chat is private; A cannot load B’s session (API 403). Default share remains **Keep private**. Coaching-not-therapy reminder stays on the counselor page.

Without Clerk keys, the API fails closed (`503` on `/v1/*`) and the web app shows `/setup`. For **tests only**, `M1_DEV_AUTH_BYPASS=1` (API) plus `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` (web) uses `X-Person-Id` (`person_a` / `person_b`) so CI and local click-through work. Do not enable bypass in production.

- With `ANTHROPIC_API_KEY` set and the API restarted, counselor replies come from Claude; otherwise the local mock (`GET /health` shows `"counselor":"mock"`).
- Every Claude call is built only from the owner allowlist. Partner-private fields never enter the prompt.
- Web is JS/JSX only (no `tsconfig.json`) so Next does not run the Week-0 TypeScript verify crash.
- Store: in-memory (reset on API restart). Optional: `M0_STORE_PATH=./data/m0-store.json npm run dev:api`
- Threat model + acceptance: [docs/M1.md](docs/M1.md). M0 counselor notes: [docs/M0.md](docs/M0.md).

```bash
npm test
```

API (auth required when Clerk is configured; `person_id` from Clerk `sub` only):

- `GET /v1/me`
- `GET /v1/disclaimers` · `POST /v1/disclaimers/accept`
- `POST /v1/relationships` · `GET /v1/relationships/current` · `POST /v1/relationships/current/invites`
- `GET /v1/invites/lookup?token=` · `POST /v1/invites/accept`
- `POST /v1/sessions` · `GET /v1/sessions` · `GET /v1/sessions/:sessionId`
- `POST /v1/sessions/:sessionId/turns` · `advance` · `share` (no-op stub, stays KEEP)
- `POST /v1/webhooks/clerk` (Svix signature; optional)
