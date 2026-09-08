/**
 * Relationship + membership + one-time invite flows.
 * Invite raw tokens are returned once; only SHA-256 hashes are stored.
 */
import { createHash, randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_INVITE_TTL_MS,
  INVITE_STATUS,
  MAX_ACTIVE_MEMBERS,
  MEMBERSHIP_STATUS,
  RELATIONSHIP_STATUS,
} from "./constants.mjs";
import { publicRelationshipView } from "./repo-filters.mjs";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function hashInviteToken(rawToken) {
  return createHash("sha256").update(String(rawToken), "utf8").digest("hex");
}

function inviteTtlMs() {
  const raw = process.env.INVITE_TTL_MS;
  const n = raw ? Number(raw) : DEFAULT_INVITE_TTL_MS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_INVITE_TTL_MS;
}

function inviteBaseUrl() {
  return (process.env.INVITE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function inviteUrl(rawToken) {
  return `${inviteBaseUrl()}/join?token=${encodeURIComponent(rawToken)}`;
}

function publicInvite(invite, { includeUrlToken } = {}) {
  const dto = {
    inviteId: invite.inviteId,
    relationshipId: invite.relationshipId,
    status: invite.status,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt || null,
    createdAt: invite.createdAt,
  };
  if (includeUrlToken && includeUrlToken.rawToken) {
    dto.url = inviteUrl(includeUrlToken.rawToken);
    dto.token = includeUrlToken.rawToken;
  }
  return dto;
}

export function createRelationshipService(store, options = {}) {
  const clock = options.clock || Date.now;

  function requireActiveMembership(personId) {
    const membership = store.activeMembershipFor(personId);
    if (!membership) throw httpError(409, "Active relationship membership required");
    return membership;
  }

  function expireIfNeeded(invite, nowMs) {
    if (!invite) return invite;
    if (invite.status === INVITE_STATUS.PENDING && nowMs > invite.expiresAtMs) {
      invite.status = INVITE_STATUS.EXPIRED;
      store.saveInvite(invite);
    }
    return invite;
  }

  return {
    create(personId) {
      const rel = store.createRelationship(personId);
      return publicRelationshipView(rel, store.listAllMemberships(), personId);
    },

    current(personId) {
      const membership =
        store.activeMembershipFor(personId) ||
        store.membershipsFor(personId).find((m) => m.status === MEMBERSHIP_STATUS.INVITED);
      if (!membership) return { relationship: null };
      const rel = store.getRelationship(membership.relationshipId);
      if (!rel) return { relationship: null };
      return {
        relationship: publicRelationshipView(rel, store.listAllMemberships(), personId),
      };
    },

    getById(personId, relationshipId) {
      if (!store.canAccessRelationship(personId, relationshipId)) {
        throw httpError(403, "Forbidden");
      }
      const rel = store.getRelationship(relationshipId);
      if (!rel) throw httpError(404, "Relationship not found");
      return publicRelationshipView(rel, store.listAllMemberships(), personId);
    },

    createInvite(personId) {
      const membership = requireActiveMembership(personId);
      const rel = store.getRelationship(membership.relationshipId);
      const actives = store.activeMembersOf(membership.relationshipId);
      if (actives.length >= MAX_ACTIVE_MEMBERS) {
        throw httpError(409, "Relationship already has two members");
      }
      for (const pending of store.pendingInvitesForRelationship(membership.relationshipId)) {
        pending.status = INVITE_STATUS.REVOKED;
        store.saveInvite(pending);
      }
      const nowMs = clock();
      const ttl = options.inviteTtlMs || inviteTtlMs();
      const rawToken = randomBytes(32).toString("base64url");
      const invite = {
        inviteId: randomUUID(),
        relationshipId: membership.relationshipId,
        createdByPersonId: personId,
        tokenHash: hashInviteToken(rawToken),
        status: INVITE_STATUS.PENDING,
        expiresAtMs: nowMs + ttl,
        expiresAt: new Date(nowMs + ttl).toISOString(),
        usedAt: null,
        acceptedByPersonId: null,
        createdAt: new Date(nowMs).toISOString(),
      };
      store.saveInvite(invite);
      return {
        relationship: publicRelationshipView(rel, store.listAllMemberships(), personId),
        invite: publicInvite(invite, { includeUrlToken: { rawToken } }),
      };
    },

    lookup(personId, rawToken) {
      const invite = expireIfNeeded(store.getInviteByTokenHash(hashInviteToken(rawToken)), clock());
      if (!invite || invite.status !== INVITE_STATUS.PENDING) {
        throw httpError(410, "Invite is not valid");
      }
      const rel = store.getRelationship(invite.relationshipId);
      return {
        invite: publicInvite(invite),
        relationship: {
          relationshipId: rel.relationshipId,
          status: rel.status,
          memberCount: store.activeMembersOf(rel.relationshipId).length,
        },
        alreadyMember: Boolean(store.membershipOn(personId, invite.relationshipId)),
        isCreator: invite.createdByPersonId === personId,
      };
    },

    accept(personId, rawToken) {
      if (!rawToken || typeof rawToken !== "string") {
        throw httpError(400, "token is required");
      }
      const nowMs = clock();
      const invite = expireIfNeeded(store.getInviteByTokenHash(hashInviteToken(rawToken)), nowMs);
      if (!invite) throw httpError(410, "Invite is not valid");
      if (invite.status === INVITE_STATUS.EXPIRED) throw httpError(410, "Invite expired");
      if (invite.status === INVITE_STATUS.ACCEPTED || invite.usedAt) {
        throw httpError(409, "Invite already used");
      }
      if (invite.status === INVITE_STATUS.REVOKED) throw httpError(410, "Invite is not valid");
      if (invite.status !== INVITE_STATUS.PENDING) throw httpError(410, "Invite is not valid");
      if (invite.createdByPersonId === personId) {
        throw httpError(409, "Cannot accept your own invite");
      }
      if (store.activeMembershipFor(personId)) {
        throw httpError(409, "Already in an active relationship");
      }
      const actives = store.activeMembersOf(invite.relationshipId);
      if (actives.length >= MAX_ACTIVE_MEMBERS) {
        throw httpError(409, "Relationship already has two members");
      }

      store.addMembership({
        relationshipId: invite.relationshipId,
        personId,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
      invite.status = INVITE_STATUS.ACCEPTED;
      invite.usedAt = new Date(nowMs).toISOString();
      invite.acceptedByPersonId = personId;
      store.saveInvite(invite);

      const rel = store.getRelationship(invite.relationshipId);
      rel.status = RELATIONSHIP_STATUS.ACTIVE;
      store.saveRelationship(rel);

      return {
        relationship: publicRelationshipView(rel, store.listAllMemberships(), personId),
        invite: publicInvite(invite),
      };
    },

    leave(personId) {
      const membership = store.activeMembershipFor(personId);
      if (!membership) throw httpError(404, "No active membership");
      store.leaveRelationship(personId, membership.relationshipId);
      return { left: true, relationshipId: membership.relationshipId };
    },
  };
}
