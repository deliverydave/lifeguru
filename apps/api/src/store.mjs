/**
 * In-memory store aligned with db/migrations/0001–0003.
 * Data resets on process restart unless M0_STORE_PATH is set.
 *
 * Person scoping is enforced via repo-filters (RLS stand-in). Never logs
 * message / transcript / summary_text bodies.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MEMBERSHIP_STATUS, RELATIONSHIP_STATUS } from "./constants.mjs";
import {
  activeMembershipForPerson,
  activeMembersOf,
  canAccessRelationship,
  disclaimerRowsForPerson,
  membershipOnRelationship,
  membershipsForPerson,
  sessionsOwnedBy,
} from "./repo-filters.mjs";

const STORE_PATH = process.env.M0_STORE_PATH || "";

function nowIso(clock = Date.now) {
  return new Date(clock()).toISOString();
}

export function createMemoryStore(seed = true) {
  const people = new Map();
  const accountMap = new Map();
  const relationships = new Map();
  const memberships = [];
  const invites = new Map();
  const tokenHashIndex = new Map();
  const disclaimerAcceptances = [];
  const sessions = new Map();
  const memories = new Map();

  function persist() {
    if (!STORE_PATH) return;
    const dir = path.dirname(STORE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const payload = {
      people: [...people.values()],
      accountMap: [...accountMap.values()],
      relationships: [...relationships.values()],
      memberships,
      invites: [...invites.values()],
      disclaimerAcceptances,
      sessions: [...sessions.values()],
      memories: [...memories.entries()],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(payload));
  }

  function indexInvite(invite) {
    invites.set(invite.inviteId, invite);
    if (invite.tokenHash) tokenHashIndex.set(invite.tokenHash, invite.inviteId);
  }

  function load() {
    if (!STORE_PATH || !fs.existsSync(STORE_PATH)) return false;
    const payload = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    for (const p of payload.people || []) people.set(p.personId, p);
    for (const m of payload.accountMap || []) accountMap.set(m.accountId, m);
    for (const r of payload.relationships || []) relationships.set(r.relationshipId, r);
    memberships.push(...(payload.memberships || []));
    for (const inv of payload.invites || []) indexInvite(inv);
    disclaimerAcceptances.push(...(payload.disclaimerAcceptances || []));
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
    provisionPersonForAccount(accountId) {
      const existing = accountMap.get(accountId);
      if (existing) {
        this.ensurePerson(existing.personId);
        return existing.personId;
      }
      const personId = randomUUID();
      this.ensurePerson(personId);
      accountMap.set(accountId, { accountId, personId, createdAt: nowIso() });
      persist();
      return personId;
    },
    personIdForAccount(accountId) {
      const row = accountMap.get(accountId);
      return row ? row.personId : null;
    },
    ensureDemoRelationship() {
      const relationshipId = "rel_demo";
      if (!relationships.has(relationshipId)) {
        relationships.set(relationshipId, {
          relationshipId,
          status: RELATIONSHIP_STATUS.ACTIVE,
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
              status: MEMBERSHIP_STATUS.ACTIVE,
              joinedAt: nowIso(),
              leftAt: null,
            });
          }
        }
        persist();
      }
      return relationships.get(relationshipId);
    },
    createRelationship(personId) {
      this.ensurePerson(personId);
      if (this.activeMembershipFor(personId)) {
        const err = new Error("Already in an active relationship");
        err.status = 409;
        throw err;
      }
      const relationshipId = randomUUID();
      const createdAt = nowIso();
      relationships.set(relationshipId, {
        relationshipId,
        status: RELATIONSHIP_STATUS.PENDING,
        createdAt,
      });
      memberships.push({
        membershipId: randomUUID(),
        relationshipId,
        personId,
        role: "member",
        status: MEMBERSHIP_STATUS.ACTIVE,
        joinedAt: createdAt,
        leftAt: null,
      });
      persist();
      return relationships.get(relationshipId);
    },
    getRelationship(relationshipId) {
      return relationships.get(relationshipId) || null;
    },
    saveRelationship(row) {
      relationships.set(row.relationshipId, row);
      persist();
      return row;
    },
    listAllMemberships() {
      return memberships;
    },
    membershipsFor(personId) {
      return membershipsForPerson(memberships, personId).filter((m) => !m.leftAt);
    },
    allMembershipsFor(personId) {
      return membershipsForPerson(memberships, personId);
    },
    activeMembershipFor(personId) {
      return activeMembershipForPerson(memberships, personId) || null;
    },
    membershipOn(personId, relationshipId) {
      return membershipOnRelationship(memberships, personId, relationshipId) || null;
    },
    canAccessRelationship(personId, relationshipId) {
      return canAccessRelationship(memberships, personId, relationshipId);
    },
    activeMembersOf(relationshipId) {
      return activeMembersOf(memberships, relationshipId);
    },
    addMembership({ relationshipId, personId, status = MEMBERSHIP_STATUS.ACTIVE, role = "member" }) {
      this.ensurePerson(personId);
      const existing = memberships.find(
        (m) => m.relationshipId === relationshipId && m.personId === personId,
      );
      const joinedAt = nowIso();
      if (existing) {
        existing.status = status;
        existing.leftAt = status === MEMBERSHIP_STATUS.LEFT ? joinedAt : null;
        if (status === MEMBERSHIP_STATUS.ACTIVE) existing.joinedAt = joinedAt;
        persist();
        return existing;
      }
      const row = {
        membershipId: randomUUID(),
        relationshipId,
        personId,
        role,
        status,
        joinedAt,
        leftAt: status === MEMBERSHIP_STATUS.LEFT ? joinedAt : null,
      };
      memberships.push(row);
      persist();
      return row;
    },
    leaveRelationship(personId, relationshipId) {
      const row = memberships.find(
        (m) => m.relationshipId === relationshipId && m.personId === personId,
      );
      if (!row || row.status === MEMBERSHIP_STATUS.LEFT) {
        const err = new Error("Membership not found");
        err.status = 404;
        throw err;
      }
      row.status = MEMBERSHIP_STATUS.LEFT;
      row.leftAt = nowIso();
      const remaining = this.activeMembersOf(relationshipId);
      const rel = relationships.get(relationshipId);
      if (rel && remaining.length < 2) {
        rel.status = remaining.length === 0 ? RELATIONSHIP_STATUS.ARCHIVED : RELATIONSHIP_STATUS.FROZEN;
        relationships.set(relationshipId, rel);
      }
      persist();
      return row;
    },
    saveInvite(invite) {
      indexInvite(invite);
      persist();
      return invite;
    },
    getInvite(inviteId) {
      return invites.get(inviteId) || null;
    },
    getInviteByTokenHash(tokenHash) {
      const id = tokenHashIndex.get(tokenHash);
      return id ? invites.get(id) || null : null;
    },
    pendingInvitesForRelationship(relationshipId) {
      return [...invites.values()].filter(
        (i) => i.relationshipId === relationshipId && i.status === "pending",
      );
    },
    recordDisclaimer({ personId, key, version, acceptedAt }) {
      this.ensurePerson(personId);
      const existing = disclaimerAcceptances.find(
        (r) => r.personId === personId && r.key === key && r.version === version,
      );
      if (existing) return existing;
      const row = {
        acceptanceId: randomUUID(),
        personId,
        key,
        version,
        acceptedAt: acceptedAt || nowIso(),
      };
      disclaimerAcceptances.push(row);
      persist();
      return row;
    },
    disclaimersFor(personId) {
      return disclaimerRowsForPerson(disclaimerAcceptances, personId);
    },
    hasRequiredDisclaimers(personId, required) {
      const rows = this.disclaimersFor(personId);
      return required.every((need) =>
        rows.some((r) => r.key === need.key && r.version === need.version),
      );
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
      return sessionsOwnedBy(sessions, personId);
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
      return {
        people,
        accountMap,
        relationships,
        memberships,
        invites,
        disclaimerAcceptances,
        sessions,
        memories,
      };
    },
  };

  if (!load() && seed) {
    store.ensureDemoRelationship();
  }

  return store;
}
