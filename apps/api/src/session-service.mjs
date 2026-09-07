/**
 * Owner-scoped private sessions. Partner B rows are never read when serving counselor A.
 */
import { randomUUID } from "node:crypto";
import { assembleOwnerContext } from "@couples-coach/context-builders";
import { counselorReply } from "@couples-coach/mock-counselor";
import { nextStage, sessionTimer, normalizeStage } from "@couples-coach/session-orchestrator";
import { DEFAULT_SHARE_DECISION } from "@couples-coach/consent-gateway";

function publicSession(session, nowMs = Date.now()) {
  return {
    sessionId: session.sessionId,
    personId: session.personId,
    relationshipId: session.relationshipId,
    stage: session.stage,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
    shareDecision: session.shareDecision,
    turns: session.turns,
    timer: sessionTimer(session.startedAtMs, session.stage, nowMs),
  };
}

function assertOwner(session, personId) {
  if (!session) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.personId !== personId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

function ownerContextBag(store, session) {
  return assembleOwnerContext({
    ownerPersonId: session.personId,
    stage: session.stage,
    ownerTurns: session.turns.map((t) => ({ role: t.role, text: t.text })),
    ownerMemories: store.getMemories(session.personId),
    sharedArtifacts: store.getSharedArtifacts(),
    jointGoals: store.getJointGoals(),
  });
}

export function createSessionService(store, options = {}) {
  const reply = options.counselorReply || counselorReply;
  return {
    async createSession(personId) {
      store.ensurePerson(personId);
      store.ensureDemoRelationship();
      const startedAtMs = Date.now();
      const session = {
        sessionId: randomUUID(),
        personId,
        relationshipId: "rel_demo",
        stage: nextStage("START", "session_created"),
        startedAtMs,
        startedAt: new Date(startedAtMs).toISOString(),
        updatedAt: new Date(startedAtMs).toISOString(),
        shareDecision: DEFAULT_SHARE_DECISION,
        privateSummary: null,
        turns: [],
      };
      const bag = ownerContextBag(store, session);
      const opening = await reply({ rawBag: bag, userText: "" });
      session.turns.push({
        turnId: randomUUID(),
        role: "assistant",
        text: opening,
        stage: session.stage,
        createdAt: session.startedAt,
      });
      store.saveSession(session);
      return publicSession(session);
    },

    getSession(personId, sessionId) {
      const session = store.getSession(sessionId);
      assertOwner(session, personId);
      return publicSession(session);
    },

    async addUserTurn(personId, sessionId, text) {
      if (typeof text !== "string" || !text.trim()) {
        const err = new Error("text is required");
        err.status = 400;
        throw err;
      }
      const session = store.getSession(sessionId);
      assertOwner(session, personId);
      const nowMs = Date.now();
      const timer = sessionTimer(session.startedAtMs, session.stage, nowMs);
      session.turns.push({
        turnId: randomUUID(),
        role: "user",
        text: text.trim(),
        stage: session.stage,
        createdAt: new Date(nowMs).toISOString(),
      });
      const bag = ownerContextBag(store, session);
      const assistantText = await reply({ rawBag: bag, userText: text.trim(), timer });
      const assistantTurn = {
        turnId: randomUUID(),
        role: "assistant",
        text: assistantText,
        stage: session.stage,
        createdAt: new Date().toISOString(),
      };
      session.turns.push(assistantTurn);
      session.updatedAt = assistantTurn.createdAt;
      store.saveSession(session);
      return {
        ...publicSession(session),
        counselorReply: assistantTurn,
      };
    },

    async advanceStage(personId, sessionId, event = "advance") {
      const session = store.getSession(sessionId);
      assertOwner(session, personId);
      session.stage = nextStage(session.stage, event);
      session.stage = normalizeStage(session.stage);
      session.updatedAt = new Date().toISOString();
      const bag = ownerContextBag(store, session);
      const assistantText = await reply({
        rawBag: bag,
        userText: "",
        timer: sessionTimer(session.startedAtMs, session.stage),
      });
      session.turns.push({
        turnId: randomUUID(),
        role: "assistant",
        text: assistantText,
        stage: session.stage,
        createdAt: session.updatedAt,
      });
      store.saveSession(session);
      return publicSession(session);
    },

    shareStub(personId, sessionId) {
      const session = store.getSession(sessionId);
      assertOwner(session, personId);
      return {
        decision: session.shareDecision || DEFAULT_SHARE_DECISION,
        applied: false,
        note: "M0 sharing is a no-op stub. Default remains Keep private. Consent Gateway persistence is out of scope.",
      };
    },
  };
}
