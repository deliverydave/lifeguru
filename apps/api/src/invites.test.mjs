import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./index.mjs";
import { createMemoryStore } from "./store.mjs";
import { MEMBERSHIP_STATUS } from "./constants.mjs";
import { acceptDisclaimersHttp, json, listen } from "./test-helpers.mjs";

function appWithClock(store, clock) {
  return createApp({ store, authBypass: true, clock, inviteTtlMs: 60_000 });
}

async function onboard(url, personId) {
  const res = await acceptDisclaimersHttp(url, { personId });
  assert.equal(res.status, 200);
}

test("create relationship + invite; accept once; reuse fails closed", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(appWithClock(store, Date.now));
  try {
    await onboard(url, "person_a");
    await onboard(url, "person_b");
    await onboard(url, "person_c");

    const created = await json(`${url}/v1/relationships`, { method: "POST", personId: "person_a" });
    assert.equal(created.status, 201);
    assert.equal(created.data.memberCount, 1);
    assert.equal(created.data.yourMembership.status, "active");
    assert.equal(created.data.status, "pending");

    const invited = await json(`${url}/v1/relationships/current/invites`, {
      method: "POST",
      personId: "person_a",
    });
    assert.equal(invited.status, 201);
    const token = invited.data.invite.token;
    assert.ok(token);
    assert.ok(invited.data.invite.url.includes("/join?token="));
    assert.equal(JSON.stringify(invited.data).includes("tokenHash"), false);

    const selfAccept = await json(`${url}/v1/invites/accept`, {
      method: "POST",
      personId: "person_a",
      body: { token },
    });
    assert.equal(selfAccept.status, 409);

    const lookup = await json(`${url}/v1/invites/lookup?token=${encodeURIComponent(token)}`, {
      personId: "person_b",
    });
    assert.equal(lookup.status, 200);
    assert.equal(lookup.data.isCreator, false);

    const accepted = await json(`${url}/v1/invites/accept`, {
      method: "POST",
      personId: "person_b",
      body: { token },
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.relationship.status, "active");
    assert.equal(accepted.data.relationship.memberCount, 2);

    const reuse = await json(`${url}/v1/invites/accept`, {
      method: "POST",
      personId: "person_c",
      body: { token },
    });
    assert.equal(reuse.status, 409);
  } finally {
    await close();
  }
});

test("expired invite fails closed", async () => {
  const store = createMemoryStore(false);
  let now = Date.parse("2026-09-08T00:00:00.000Z");
  const { url, close } = await listen(appWithClock(store, () => now));
  try {
    await onboard(url, "person_a");
    await onboard(url, "person_b");
    await json(`${url}/v1/relationships`, { method: "POST", personId: "person_a" });
    const invited = await json(`${url}/v1/relationships/current/invites`, {
      method: "POST",
      personId: "person_a",
    });
    const token = invited.data.invite.token;
    now += 120_000;

    const expiredLookup = await json(`${url}/v1/invites/lookup?token=${encodeURIComponent(token)}`, {
      personId: "person_b",
    });
    assert.equal(expiredLookup.status, 410);

    const expiredAccept = await json(`${url}/v1/invites/accept`, {
      method: "POST",
      personId: "person_b",
      body: { token },
    });
    assert.equal(expiredAccept.status, 410);
  } finally {
    await close();
  }
});

test("invited membership cannot open a private session", async () => {
  const store = createMemoryStore(false);
  store.ensurePerson("person_a");
  const rel = store.createRelationship("person_a");
  store.addMembership({
    relationshipId: rel.relationshipId,
    personId: "person_c",
    status: MEMBERSHIP_STATUS.INVITED,
  });
  const { url, close } = await listen(createApp({ store, authBypass: true }));
  try {
    await onboard(url, "person_c");
    const created = await json(`${url}/v1/sessions`, { method: "POST", personId: "person_c" });
    assert.equal(created.status, 409);
  } finally {
    await close();
  }
});

test("non-member cannot read a relationship (membership IDOR)", async () => {
  const store = createMemoryStore(false);
  const { url, close } = await listen(createApp({ store, authBypass: true }));
  try {
    await onboard(url, "person_a");
    await onboard(url, "person_z");
    const created = await json(`${url}/v1/relationships`, { method: "POST", personId: "person_a" });
    const id = created.data.relationshipId;
    const cross = await json(`${url}/v1/relationships/${id}`, { personId: "person_z" });
    assert.equal(cross.status, 403);
  } finally {
    await close();
  }
});
