import assert from "node:assert/strict";
import { test } from "node:test";
import { counselorReply } from "./index.mjs";
import { ANTHROPIC_MESSAGES_URL, completeAnthropic, DEFAULT_ANTHROPIC_MODEL } from "./anthropic.mjs";
import { buildCounselorPrompt } from "./prompt.mjs";

function ownerBag(overrides = {}) {
  return {
    ownerPersonId: "person_a",
    stage: "CHECK_IN",
    ownerTurns: [],
    ownerMemories: [],
    sharedArtifacts: [],
    jointGoals: [],
    ...overrides,
  };
}

test("Anthropic client posts allowlisted prompt and returns text (no live network)", async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, headers: init.headers, body: JSON.parse(init.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: "You named tension at dinner — what happened in your body right then?" }],
      }),
    };
  };
  const prompt = buildCounselorPrompt({
    rawBag: ownerBag({
      ownerTurns: [{ role: "user", text: "I felt tense at dinner" }],
    }),
    userText: "I felt tense at dinner",
  });
  const text = await completeAnthropic({ prompt, apiKey: "test-key", fetchImpl });
  assert.match(text, /dinner/);
  assert.equal(captured.url, ANTHROPIC_MESSAGES_URL);
  assert.equal(captured.body.model, DEFAULT_ANTHROPIC_MODEL);
  assert.equal(captured.headers["x-api-key"], "test-key");
  const sent = JSON.stringify(captured.body);
  assert.equal(/partnerTranscript|partnerMemories|partnerPrivateSummary/.test(sent), false);
  assert.equal(sent.includes("blue elephant"), false);
});

test("counselorReply uses injected Anthropic fetch when apiKey is set", async () => {
  let called = 0;
  const text = await counselorReply({
    rawBag: ownerBag({ ownerTurns: [{ role: "user", text: "I felt tense at dinner" }] }),
    userText: "I felt tense at dinner",
    apiKey: "test-key",
    fetchImpl: async () => {
      called += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "Let's stay with that tension at dinner." }] }),
      };
    },
  });
  assert.equal(called, 1);
  assert.match(text, /dinner/);
});

test("counselorReply falls back to mock when ANTHROPIC_API_KEY is missing and does not fetch", async () => {
  const prev = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  let called = false;
  try {
    const text = await counselorReply({
      rawBag: ownerBag(),
      userText: "",
      fetchImpl: async () => {
        called = true;
        throw new Error("network");
      },
    });
    assert.equal(called, false);
    assert.ok(text.length > 0);
  } finally {
    if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prev;
  }
});

test("partner-private keys never reach the mocked Anthropic fetch", async () => {
  let called = false;
  await assert.rejects(
    () =>
      counselorReply({
        rawBag: ownerBag({ partnerTranscript: "secret from B" }),
        userText: "hi",
        apiKey: "test-key",
        fetchImpl: async () => {
          called = true;
          throw new Error("network");
        },
      }),
    /Partner-private fields rejected/
  );
  assert.equal(called, false);
});

test("ANTHROPIC_MODEL override is sent on the mocked request", async () => {
  let model;
  const prompt = buildCounselorPrompt({ rawBag: ownerBag(), userText: "hi" });
  await completeAnthropic({
    prompt,
    apiKey: "test-key",
    model: "claude-test-override",
    fetchImpl: async (_url, init) => {
      model = JSON.parse(init.body).model;
      return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "Hello." }] }) };
    },
  });
  assert.equal(model, "claude-test-override");
});
