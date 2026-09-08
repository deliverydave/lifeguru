import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./index.mjs";
import { createMemoryStore } from "./store.mjs";
import { REQUIRED_DISCLAIMERS } from "./constants.mjs";
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

test("private routes require auth when Clerk is configured", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(clerkApp(store, { tok_a: "user_a" }));
  try {
    const none = await json(`${url}/v1/me`);
    assert.equal(none.status, 401);

    const bad = await json(`${url}/v1/me`, { token: "nope" });
    assert.equal(bad.status, 401);

    const health = await json(`${url}/health`);
    assert.equal(health.status, 200);
    assert.equal(health.data.auth, "clerk");
    assert.equal(health.data.milestone, "M1");
  } finally {
    await close();
  }
});

test("live auth without Clerk keys fails closed with 503", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(
    createApp({ store, authBypass: false, clerkConfigured: false, secretKey: "" }),
  );
  try {
    const res = await json(`${url}/v1/me`, { token: "anything" });
    assert.equal(res.status, 503);
    assert.match(res.data.error, /CLERK_SECRET_KEY/);
  } finally {
    await close();
  }
});

test("Clerk sub maps to a stable opaque person_id; X-Person-Id is ignored", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(clerkApp(store, { tok_a: "user_a", tok_b: "user_b" }));
  try {
    const first = await json(`${url}/v1/me`, { token: "tok_a" });
    assert.equal(first.status, 200);
    assert.ok(first.data.personId);
    assert.notEqual(first.data.personId, "user_a");

    const second = await json(`${url}/v1/me`, { token: "tok_a" });
    assert.equal(second.data.personId, first.data.personId);

    const spoof = await json(`${url}/v1/me`, {
      token: "tok_a",
      personId: "person_b",
    });
    assert.equal(spoof.data.personId, first.data.personId);

    const other = await json(`${url}/v1/me`, { token: "tok_b" });
    assert.equal(other.status, 200);
    assert.notEqual(other.data.personId, first.data.personId);
  } finally {
    await close();
  }
});

test("webhook user.created provisions AccountPersonMap", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(
    createApp({
      store,
      authBypass: false,
      clerkConfigured: true,
      secretKey: "sk_test_not_real",
      webhookSecret: "whsec_test",
      verifyWebhook: (raw) => JSON.parse(raw),
      verifyClerkToken: async (token) => {
        if (token !== "tok_a") throw new Error("invalid");
        return { sub: "user_hook" };
      },
    }),
  );
  try {
    const hooked = await fetch(`${url}/v1/webhooks/clerk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user.created", data: { id: "user_hook" } }),
    });
    assert.equal(hooked.status, 200);
    const personId = store.personIdForAccount("user_hook");
    assert.ok(personId);

    const me = await json(`${url}/v1/me`, { token: "tok_a" });
    assert.equal(me.status, 200);
    assert.equal(me.data.personId, personId);
  } finally {
    await close();
  }
});

test("invalid webhook signature fails closed", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(
    createApp({
      store,
      authBypass: false,
      webhookSecret: "whsec_test",
      verifyWebhook: () => {
        throw new Error("bad sig");
      },
    }),
  );
  try {
    const hooked = await fetch(`${url}/v1/webhooks/clerk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user.created", data: { id: "user_x" } }),
    });
    const data = await hooked.json();
    assert.equal(hooked.status, 401);
    assert.equal(store.personIdForAccount("user_x"), null);
    assert.equal(data.status, 401);
  } finally {
    await close();
  }
});

test("sessions require disclaimers when Clerk is configured", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(clerkApp(store, { tok_a: "user_a" }));
  try {
    const blocked = await json(`${url}/v1/sessions`, { method: "POST", token: "tok_a" });
    assert.equal(blocked.status, 403);
    assert.match(blocked.data.error, /disclaimer/i);

    const accepted = await json(`${url}/v1/disclaimers/accept`, {
      method: "POST",
      token: "tok_a",
      body: { acceptances: REQUIRED_DISCLAIMERS },
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.disclaimers.complete, true);

    const stillNoRel = await json(`${url}/v1/sessions`, { method: "POST", token: "tok_a" });
    assert.equal(stillNoRel.status, 409);
  } finally {
    await close();
  }
});

test("onboarding records timestamp + version for both disclaimers", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(createApp({ store, authBypass: true }));
  try {
    const res = await acceptDisclaimersHttp(url, { personId: "person_a" });
    assert.equal(res.status, 200);
    assert.equal(res.data.disclaimers.acceptances.length, 2);
    for (const row of res.data.disclaimers.acceptances) {
      assert.ok(row.acceptedAt);
      assert.ok(row.version);
    }
    const mismatch = await json(`${url}/v1/disclaimers/accept`, {
      method: "POST",
      personId: "person_a",
      body: { acceptances: [{ key: "privacy-explainer", version: "old" }] },
    });
    assert.equal(mismatch.status, 400);
  } finally {
    await close();
  }
});
