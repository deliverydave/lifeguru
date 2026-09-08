/**
 * Repository filters documenting person scoping (runtime stand-in for RLS).
 *
 * Equivalent sketches live in db/migrations/0003_m1_auth_linking.sql:
 *   private_session / private_turn : owner_person_id = auth.person_id()
 *   membership                     : person_id = auth.person_id()
 *   relationship                   : exists membership for auth.person_id()
 *   disclaimer_acceptance          : person_id = auth.person_id()
 *   invite                         : created_by or active member of relationship
 *   identity_person_map            : Auth/Map service only — never counseling reads
 *
 * Never return another person's private session/turn/memory rows from these helpers.
 */
import { MEMBERSHIP_STATUS } from "./constants.mjs";

export function sessionsOwnedBy(sessions, personId) {
  const list = sessions instanceof Map ? [...sessions.values()] : sessions;
  return list.filter((s) => s && s.personId === personId);
}

export function membershipsForPerson(memberships, personId) {
  return memberships.filter((m) => m.personId === personId);
}

export function activeMembershipForPerson(memberships, personId) {
  return memberships.find(
    (m) => m.personId === personId && m.status === MEMBERSHIP_STATUS.ACTIVE && !m.leftAt,
  );
}

export function membershipOnRelationship(memberships, personId, relationshipId) {
  return memberships.find(
    (m) => m.personId === personId && m.relationshipId === relationshipId && m.status !== MEMBERSHIP_STATUS.LEFT,
  );
}

export function canAccessRelationship(memberships, personId, relationshipId) {
  return Boolean(membershipOnRelationship(memberships, personId, relationshipId));
}

export function activeMembersOf(memberships, relationshipId) {
  return memberships.filter(
    (m) => m.relationshipId === relationshipId && m.status === MEMBERSHIP_STATUS.ACTIVE && !m.leftAt,
  );
}

export function disclaimerRowsForPerson(rows, personId) {
  return rows.filter((r) => r.personId === personId);
}

/** Public relationship DTO: membership-scoped, no partner private rows. */
export function publicRelationshipView(relationship, memberships, personId) {
  if (!relationship) return null;
  const mine = membershipOnRelationship(memberships, personId, relationship.relationshipId);
  if (!mine) return null;
  const actives = activeMembersOf(memberships, relationship.relationshipId);
  return {
    relationshipId: relationship.relationshipId,
    status: relationship.status,
    createdAt: relationship.createdAt,
    memberCount: actives.length,
    yourMembership: {
      membershipId: mine.membershipId,
      status: mine.status,
      role: mine.role,
      joinedAt: mine.joinedAt,
      leftAt: mine.leftAt || null,
    },
  };
}
