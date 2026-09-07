/**
 * M0 in-memory store aligned with db/migrations/0001 (person / relationship / membership)
 * and 0002 private_session comments. Data resets on process restart unless M0_STORE_PATH is set.
 *
 * Never logs message / transcript / summary_text bodies.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const STORE_PATH = process.env.M0_STORE_PATH || "";

function nowIso() {
  return new Date().toISOString();
}

export function createMemoryStore(seed = true) {
  const people = new Map();
  const relationships = new Map();
  const memberships = [];
  const sessions = new Map();
  const memories = new Map();

  function persist() {
    if (!STORE_PATH) return;
    const dir = path.dirname(STORE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const payload = {
      people: [...people.values()],
      relationships: [...relationships.values()],
      memberships,
      sessions: [...sessions.values()],
      memories: [...memories.entries()],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload));
  }

  function load() {
    if (!STORE_PATH || !fs.existsSync(STORE_PATH)) return false;
    const payload = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    for (const p of payload.people || []) people.set(p.personId, p);
    for (const r of payload.relationships || []) relationships.set(r.relationshipId, r);
    memberships.push(...(payload.memberships || []));
    for (const s of payload.sessions || []) sessions.set(s.sessionId, s);
    for (const [pid, list] of payload.memories || []) memories.set(pid, list);
    return true;
  }

  const store = {
    ensurePerson(personId) {
      if (!people.has(personId)) {
        people.set(personId, { personId, createdAt: nowIso() });
        persist();
      }
      return people.get(personId);
    },
    getPerson(personId) {
      return people.get(personId) || null;
    },
    ensureDemoRelationship() {
      const relationshipId = "rel_demo";
      if (!relationships.has(relationshipId)) {
        relationships.set(relationshipId, {
          relationshipId,
          status: "active",
          createdAt: nowIso(),
        });
        for (const personId of ["person_a", "person_b"]) {
          this.ensurePerson(personId);
          if (!memberships.some((m) => m.relationshipId === relationshipId && m.personId === personId)) {
            memberships.push({
              membershipId: randomUUID(),
              relationshipId,
              personId,
              role: "member",
              joinedAt: nowIso(),
            });
          }
        }
        persist();
      }
      return relationships.get(relationshipId);
    },
    membershipsFor(personId) {
      return memberships.filter((m) => m.personId === personId && !m.leftAt);
    },
    saveSession(session) {
      sessions.set(session.sessionId, session);
      persist();
      return session;
    },
    getSession(sessionId) {
      return sessions.get(sessionId) || null;
    },
    listSessionsFor(personId) {
      return [...sessions.values()].filter((s) => s.personId === personId);
    },
    getMemories(personId) {
      return memories.get(personId) || [];
    },
    setMemories(personId, list) {
      memories.set(personId, list);
      persist();
    },
    getSharedArtifacts() {
      return [];
    },
    getJointGoals() {
      return [];
    },
    _debugDump() {
      return { people, relationships, memberships, sessions, memories };
    },
  };

  if (!load() && seed) {
    store.ensureDemoRelationship();
  }

  return store;
}
