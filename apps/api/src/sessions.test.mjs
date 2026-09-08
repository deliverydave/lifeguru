import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./index.mjs";
import { createMemoryStore } from "./store.mjs";
import { createSessionService } from "./session-service.mjs";
import { SESSION_STAGES, SOFT_TIMER_LIMIT_MS } from "@couples-coach/session-orchestrator";
import { SAFE_REFUSAL } from "@couples-coach/mock-counselor";
import { acceptDisclaimersHttp, json, listen } from "./test-helpers.mjs";

delete process.env.ANTHROPIC_API_KEY;

function testApp(store = createMemoryStore()) {
  return createApp({ store, authBypass: true });
}

async function ready(url, personId) {
  const accepted = await acceptDisclaimersHttp(url, { personId });
  assert.equal(accepted.status, 200);
}

test("create / get session, user turn, and advance stage", async () => {
  const { url, close } = await listen(testApp());
  try {
    await ready(url, "person_a");
    const created = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_a" });
    assert.equal(created.status, 201);
    assert.equal(created.data.personId, "person_a");
    assert.equal(created.data.stage, "CHECK_IN");
    assert.ok(created.data.timer);
    assert.equal(created.data.timer.hardKill, false);
    assert.ok(created.data.turns.length >= 1);

    const sessionId = created.data.sessionId;
    const got = await json(`${url}/v1/sessions/${sessionId}`, { personId: "person_a" });
    assert.equal(got.status, 200);
    assert.equal(got.data.sessionId, sessionId);

    const turn = await json(`${url}/v1/sessions/${sessionId}/turns`, {
      method: "POST",
      personId: "person_a",
      body: { text: "I felt tense at dinner" },
    });
    assert.equal(turn.status, 200);
    assert.equal(turn.data.counselorReply.role, "assistant");
    assert.ok(turn.data.counselorReply.text.length > 0);
    assert.equal(turn.data.counselorReply.text.includes("blue elephant"), false);

    const advanced = await json(`${url}/v1/sessions/${sessionId}/advance`, {
      method: "POST",
      personId: "person_a",
      body: { event: "advance" },
    });
    assert.equal(advanced.status, 200);
    assert.equal(advanced.data.stage, "IDENTIFY_CURRENT_ISSUE");
  } finally {
    await close();
  }
});

test("couple privacy: person_b cannot fetch or write person_a session (IDOR)", async () => {
  const { url, close } = await listen(testApp());
  try {
    await ready(url, "person_a");
    await ready(url, "person_b");
    const a = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_a" });
    const b = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_b" });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.notEqual(a.data.sessionId, b.data.sessionId);

    const crossGet = await json(`${url}/v1/sessions/${a.data.sessionId}`, { personId: "person_b" });
    assert.equal(crossGet.status, 403);

    const crossTurn = await json(`${url}/v1/sessions/${a.data.sessionId}/turns`, {
      method: "POST",
      personId: "person_b",
      body: { text: "what did my partner say?" },
    });
    assert.equal(crossTurn.status, 403);

    const crossAdvance = await json(`${url}/v1/sessions/${a.data.sessionId}/advance`, {
      method: "POST",
      personId: "person_b",
    });
    assert.equal(crossAdvance.status, 403);
  } finally {
    await close();
  }
});

test("partner secret cannot appear in counselor A context or reply", async () => {
  const store = createMemoryStore();
  const svc = createSessionService(store);
  const partner = await svc.createSession("person_b");
  await svc.addUserTurn("person_b", partner.sessionId, "I am hiding a blue elephant");
  store.setMemories("person_b", [{ value: "blue elephant hideout" }]);

  const owner = await svc.createSession("person_a");
  const result = await svc.addUserTurn("person_a", owner.sessionId, "what did my partner say?");
  assert.equal(result.counselorReply.text, SAFE_REFUSAL);
  const blob = JSON.stringify(result);
  assert.equal(blob.includes("blue elephant"), false);
});

test("soft timer overtime still completes the user turn (no hard kill)", async () => {
  const store = createMemoryStore();
  const svc = createSessionService(store);
  const created = await svc.createSession("person_a");
  const session = store.getSession(created.sessionId);
  session.startedAtMs = Date.now() - SOFT_TIMER_LIMIT_MS - 5_000;
  store.saveSession(session);
  const result = await svc.addUserTurn("person_a", created.sessionId, "still talking after twenty minutes");
  assert.ok(result.counselorReply.text.length > 0);
  assert.equal(result.timer.overtime, true);
  assert.equal(result.timer.hardKill, false);
  assert.match(result.counselorReply.text, /20-minute|soft/i);
});

test("injected counselor is used for a user turn (mocked Claude, no network)", async () => {
  const store = createMemoryStore();
  const svc = createSessionService(store, {
    counselorReply: async ({ userText }) =>
      userText
        ? "You named tension at dinner — what happened in your body right then?"
        : "How are you arriving to this session?",
  });
  const created = await svc.createSession("person_a");
  const result = await svc.addUserTurn("person_a", created.sessionId, "I felt tense at dinner");
  assert.match(result.counselorReply.text, /dinner/);
  assert.equal(result.counselorReply.text.includes("blue elephant"), false);
});

test("share stub stays Keep private and does nothing unsafe", async () => {
  const { url, close } = await listen(testApp());
  try {
    await ready(url, "person_a");
    const a = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_a" });
    const share = await json(`${url}/v1/sessions/${a.data.sessionId}/share`, {
      method: "POST",
      personId: "person_a",
    });
    assert.equal(share.status, 200);
    assert.equal(share.data.decision, "KEEP");
    assert.equal(share.data.applied, false);
  } finally {
    await close();
  }
});

test("full stage walk via service", async () => {
  const store = createMemoryStore();
  const svc = createSessionService(store);
  let s = await svc.createSession("person_a");
  assert.equal(s.stage, "CHECK_IN");
  const expected = SESSION_STAGES.slice(1);
  for (let i = 1; i < expected.length; i += 1) {
    s = await svc.advanceStage("person_a", s.sessionId);
    assert.equal(s.stage, expected[i]);
  }
  assert.equal(s.stage, "END");
});
