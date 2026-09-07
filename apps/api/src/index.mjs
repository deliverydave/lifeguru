import express from "express";
import { createMemoryStore } from "./store.mjs";
import { createSessionService } from "./session-service.mjs";

const port = Number(process.env.PORT || 3001);

export function createApp(options = {}) {
  const store = options.store || createMemoryStore();
  const sessions = createSessionService(store);
  const app = express();

  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Person-Id");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "couples-coach-api", milestone: "M0" });
  });

  function personIdFrom(req) {
    const id = req.get("x-person-id") || req.get("X-Person-Id");
    if (!id || !String(id).trim()) {
      const err = new Error("X-Person-Id header required (M0 dev stub)");
      err.status = 401;
      throw err;
    }
    return String(id).trim();
  }

  app.post("/v1/sessions", (req, res, next) => {
    try {
      const personId = personIdFrom(req);
      const created = sessions.createSession(personId);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.get("/v1/sessions/:sessionId", (req, res, next) => {
    try {
      const personId = personIdFrom(req);
      res.json(sessions.getSession(personId, req.params.sessionId));
    } catch (err) {
      next(err);
    }
  });

  app.post("/v1/sessions/:sessionId/turns", (req, res, next) => {
    try {
      const personId = personIdFrom(req);
      const text = req.body && req.body.text;
      res.json(sessions.addUserTurn(personId, req.params.sessionId, text));
    } catch (err) {
      next(err);
    }
  });

  app.post("/v1/sessions/:sessionId/advance", (req, res, next) => {
    try {
      const personId = personIdFrom(req);
      const event = (req.body && req.body.event) || "advance";
      res.json(sessions.advanceStage(personId, req.params.sessionId, event));
    } catch (err) {
      next(err);
    }
  });

  app.post("/v1/sessions/:sessionId/share", (req, res, next) => {
    try {
      const personId = personIdFrom(req);
      res.json(sessions.shareStub(personId, req.params.sessionId));
    } catch (err) {
      next(err);
    }
  });

  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) {
      console.error({
        sessionId: req.params && req.params.sessionId,
        personId: req.get("x-person-id"),
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
  app.listen(port, () => {
    console.log("api listening on " + port);
  });
}

export default app;
