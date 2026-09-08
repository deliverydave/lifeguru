import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./index.mjs";
import { createMemoryStore } from "./store.mjs";
import { acceptDisclaimersHttp, json, listen } from "./test-helpers.mjs";

function clerkApp(store, tokenToSub) {
  return createApp({
    store,
    authBypass: false,
    clerkConfigured: true,
    secretKey: "sk_test_not_real",
    verifyClerkToken: async (token) => {
      const sub = tokenToSub[token];
      if (!sub) throw new Error("invalid");
      return { sub };
    },
  });
}

async function onboard(url, token) {
  const res = await acceptDisclaimersHttp(url, { token });
  assert.equal(res.status, 200);
}

test("User A cannot read User B private sessions or membership-only resources (403)", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(clerkApp(store, { tok_a: "user_a", tok_b: "user_b" }));
  try {
    await onboard(url, "tok_a");
    await onboard(url, "tok_b");

    const rel = await json(`${url}/v1/relationships`, { method: "POST", token: "tok_a" });
    assert.equal(rel.status, 201);

    const invite = await json(`${url}/v1/relationships/current/invites`, {
      method: "POST",
      token: "tok_a",
    });
    assert.equal(invite.status, 201);

    const joined = await json(`${url}/v1/invites/accept`, {
      method: "POST",
      token: "tok_b",
      body: { token: invite.data.invite.token },
    });
    assert.equal(joined.status, 200);

    const aSession = await json(`${url}/v1/sessions`, { method: "POST", token: "tok_a" });
    assert.equal(aSession.status, 201);
    const secret = "partner-private-orchid-token";
    const turned = await json(`${url}/v1/sessions/${aSession.data.sessionId}/turns`, {
      method: "POST",
      token: "tok_a",
      body: { text: secret },
    });
    assert.equal(turned.status, 200);

    const crossGet = await json(`${url}/v1/sessions/${aSession.data.sessionId}`, { token: "tok_b" });
    assert.equal(crossGet.status, 403);

    const crossTurn = await json(`${url}/v1/sessions/${aSession.data.sessionId}/turns`, {
      method: "POST",
      token: "tok_b",
      body: { text: "what did my partner say?" },
    });
    assert.equal(crossTurn.status, 403);

    const crossShare = await json(`${url}/v1/sessions/${aSession.data.sessionId}/share`, {
      method: "POST",
      token: "tok_b",
    });
    assert.equal(crossShare.status, 403);

    const bMe = await json(`${url}/v1/me`, { token: "tok_b" });
    const bSessions = await json(`${url}/v1/sessions`, { token: "tok_b" });
    const bRel = await json(`${url}/v1/relationships/current`, { token: "tok_b" });
    const blob = JSON.stringify({ bMe: bMe.data, bSessions: bSessions.data, bRel: bRel.data, crossGet: crossGet.data });
    assert.equal(blob.includes(secret), false);
    assert.equal(bSessions.data.sessions.length, 0);
    assert.ok(!bMe.data.relationship || !("turns" in bMe.data.relationship));
  } finally {
    await close();
  }
});

test("list sessions never includes another person's private rows", async () => {
  const store = createMemoryStore();
  const { url, close } = await listen(createApp({ store, authBypass: true }));
  try {
    for (const id of ["person_a", "person_b"]) {
      const accepted = await acceptDisclaimersHttp(url, { personId: id });
      assert.equal(accepted.status, 200);
    }
    const a = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_a" });
    const b = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_b" });
    await json(`${url}/v1/sessions/${a.data.sessionId}/turns`, {
      method: "POST",
      personId: "person_a",
      body: { text: "alpha-private-needle-aaa" },
    });
    await json(`${url}/v1/sessions/${b.data.sessionId}/turns`, {
      method: "POST",
      personId: "person_b",
      body: { text: "beta-private-needle-bbb" },
    });

    const listed = await json(`${url}/v1/sessions`, { personId: "person_a" });
    assert.equal(listed.status, 200);
    assert.equal(listed.data.sessions.every((s) => s.personId === "person_a"), true);
    const blob = JSON.stringify(listed.data);
    assert.equal(blob.includes("beta-private-needle-bbb"), false);
    assert.equal(blob.includes("alpha-private-needle-aaa"), false);
    assert.ok(!listed.data.sessions.some((s) => s.sessionId === b.data.sessionId));
  } finally {
    await close();
  }
});
