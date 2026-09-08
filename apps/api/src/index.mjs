import express from "express";
import { loadLocalEnv } from "./env.mjs";
import { createMemoryStore } from "./store.mjs";
import { createSessionService } from "./session-service.mjs";
import { createRelationshipService } from "./relationship-service.mjs";
import { acceptDisclaimers, disclaimerCatalog, publicDisclaimerState } from "./disclaimer-service.mjs";
import { authMode, createAuthResolver } from "./auth.mjs";
import { createClerkWebhookHandler } from "./webhook.mjs";
import { BILLING_STUB, REQUIRED_DISCLAIMERS, SESSION_START_REMINDER } from "./constants.mjs";
import { publicRelationshipView } from "./repo-filters.mjs";

loadLocalEnv();

const port = Number(process.env.PORT || 3001);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function createApp(options = {}) {
  const store = options.store || createMemoryStore(options.seed === true);
  const sessions = createSessionService(store, options);
  const relationships = createRelationshipService(store, {
    clock: options.clock,
    inviteTtlMs: options.inviteTtlMs,
  });
  const resolvePersonId = options.resolvePersonId || createAuthResolver(store, options);
  const app = express();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Person-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.post(
    "/v1/webhooks/clerk",
    express.raw({ type: "application/json" }),
    createClerkWebhookHandler(store, options),
  );

  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_req, res) => {
    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
    res.json({
      ok: true,
      service: "couples-coach-api",
      milestone: "M1",
      counselor: hasKey ? "anthropic" : "mock",
      auth: authMode(options),
      billing: BILLING_STUB,
    });
  });

  function asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  const v1 = express.Router();

  v1.use(
    asyncHandler(async (req, _res, next) => {
      req.personId = await resolvePersonId(req);
      next();
    }),
  );

  function requireDisclaimers(req, _res, next) {
    try {
      if (!store.hasRequiredDisclaimers(req.personId, REQUIRED_DISCLAIMERS)) {
        throw httpError(403, "Privacy and coaching disclaimers must be accepted");
      }
      next();
    } catch (err) {
      next(err);
    }
  }

  function mePayload(personId) {
    const membership = store.activeMembershipFor(personId);
    const rel = membership ? store.getRelationship(membership.relationshipId) : null;
    return {
      personId,
      disclaimers: publicDisclaimerState(store, personId),
      relationship: rel ? publicRelationshipView(rel, store.listAllMemberships(), personId) : null,
      billing: BILLING_STUB,
      coachingReminder: SESSION_START_REMINDER,
      defaultShareDecision: "KEEP",
    };
  }

  v1.get(
    "/me",
    asyncHandler(async (req, res) => {
      res.json(mePayload(req.personId));
    }),
  );

  v1.get(
    "/disclaimers",
    asyncHandler(async (_req, res) => {
      res.json(disclaimerCatalog());
    }),
  );

  v1.post(
    "/disclaimers/accept",
    asyncHandler(async (req, res) => {
      const items = (req.body && (req.body.acceptances || req.body.items)) || [];
      const state = acceptDisclaimers(store, req.personId, items, options.clock || Date.now);
      res.json({ ...mePayload(req.personId), disclaimers: state });
    }),
  );

  v1.get(
    "/billing",
    requireDisclaimers,
    asyncHandler(async (_req, res) => {
      res.json(BILLING_STUB);
    }),
  );

  v1.post(
    "/relationships",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const created = relationships.create(req.personId);
      res.status(201).json(created);
    }),
  );

  v1.get(
    "/relationships/current",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      res.json(relationships.current(req.personId));
    }),
  );

  v1.get(
    "/relationships/:relationshipId",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      res.json(relationships.getById(req.personId, req.params.relationshipId));
    }),
  );

  v1.post(
    "/relationships/current/invites",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      res.status(201).json(relationships.createInvite(req.personId));
    }),
  );

  v1.post(
    "/relationships/current/leave",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      res.json(relationships.leave(req.personId));
    }),
  );

  v1.get(
    "/invites/lookup",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const token = String((req.query && req.query.token) || "");
      res.json(relationships.lookup(req.personId, token));
    }),
  );

  v1.post(
    "/invites/accept",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const token = req.body && req.body.token;
      res.json(relationships.accept(req.personId, token));
    }),
  );

  v1.get(
    "/sessions",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const list = store.listSessionsFor(req.personId).map((s) => ({
        sessionId: s.sessionId,
        personId: s.personId,
        relationshipId: s.relationshipId,
        stage: s.stage,
        startedAt: s.startedAt,
        updatedAt: s.updatedAt,
        shareDecision: s.shareDecision,
      }));
      res.json({ sessions: list });
    }),
  );

  v1.post(
    "/sessions",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const created = await sessions.createSession(req.personId);
      res.status(201).json(created);
    }),
  );

  v1.get(
    "/sessions/:sessionId",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      res.json(sessions.getSession(req.personId, req.params.sessionId));
    }),
  );

  v1.post(
    "/sessions/:sessionId/turns",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const text = req.body && req.body.text;
      res.json(await sessions.addUserTurn(req.personId, req.params.sessionId, text));
    }),
  );

  v1.post(
    "/sessions/:sessionId/advance",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      const event = (req.body && req.body.event) || "advance";
      res.json(await sessions.advanceStage(req.personId, req.params.sessionId, event));
    }),
  );

  v1.post(
    "/sessions/:sessionId/share",
    requireDisclaimers,
    asyncHandler(async (req, res) => {
      res.json(sessions.shareStub(req.personId, req.params.sessionId));
    }),
  );

  app.use("/v1", v1);

  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    if (status === 500) {
      console.error({
        sessionId: req.params && req.params.sessionId,
        personId: req.personId,
        path: req.path,
        status,
        err: err.message,
      });
    }
    res.status(status).json({ error: err.message, status });
  });

  return app;
}

const app = createApp();

if (process.argv[1] && process.argv[1].endsWith("index.mjs")) {
  const mode = authMode();
  if (mode === "unconfigured") {
    console.error(
      "CLERK_SECRET_KEY is not set. /v1/* live auth will return 503. Set Clerk keys or M1_DEV_AUTH_BYPASS=1 for tests.",
    );
  }
  if (mode === "bypass") {
    console.error("M1_DEV_AUTH_BYPASS is enabled. Do not use this flag in production.");
  }
  app.listen(port, () => {
    console.log("api listening on " + port);
  });
}

export default app;
