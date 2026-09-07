-- 0001_identity_relationship.sql
-- Week-0 identity + relationship schema stub
-- Future (not created here): PrivateSession, MemoryItem, ConsentRecord, AbstractSignal

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE visibility AS ENUM (
  'PRIVATE',
  'ABSTRACT_SHARED',
  'SHARED_EXPLICIT',
  'JOINT',
  'SYSTEM_SAFETY'
);

CREATE TYPE epistemic_type AS ENUM (
  'FACT',
  'USER_REPORT',
  'INTERPRETATION',
  'AI_HYPOTHESIS',
  'SHARED_AGREEMENT'
);

CREATE TYPE session_stage AS ENUM (
  'START',
  'CHECK_IN',
  'IDENTIFY_ISSUE',
  'EXPLORE_EVENT',
  'IDENTIFY_EMOTION',
  'IDENTIFY_NEED',
  'OBS_VS_INTERP',
  'PERSPECTIVE',
  'DESIRED_OUTCOME',
  'CONTROLLABLES',
  'SMALL_ACTION',
  'WIND_DOWN',
  'PRIVATE_SUMMARY',
  'CORRECTIONS',
  'SHARING_DECISION',
  'SAFETY_HOLD',
  'END'
);

CREATE TYPE abstract_dimension AS ENUM (
  'appreciation',
  'affection',
  'emotional_safety',
  'quality_time',
  'autonomy',
  'household_contribution',
  'financial_security',
  'sexual_connection',
  'communication',
  'trust'
);

-- person: opaque counseling identity (no email)
CREATE TABLE person (
  person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- identity_person_map: restricted account <-> person (Auth/Map service only)
CREATE TABLE identity_person_map (
  account_id TEXT PRIMARY KEY,
  person_id UUID NOT NULL UNIQUE REFERENCES person(person_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE relationship_status AS ENUM (
  'pending',
  'active',
  'frozen',
  'archived'
);

CREATE TABLE relationship (
  relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status relationship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE TYPE membership_role AS ENUM (
  'member'
);

CREATE TABLE membership (
  membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationship(relationship_id),
  person_id UUID NOT NULL REFERENCES person(person_id),
  role membership_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (relationship_id, person_id)
);

CREATE TYPE invite_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'revoked'
);

CREATE TABLE invite (
  invite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationship(relationship_id),
  created_by_person_id UUID NOT NULL REFERENCES person(person_id),
  token_hash TEXT NOT NULL UNIQUE,
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_person_id UUID REFERENCES person(person_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS sketches (enable when auth.person_id() helper exists)
-- ALTER TABLE person ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY person_self ON person
--   USING (person_id = auth.person_id());
-- Private tables (future) must use:
--   USING (owner_person_id = auth.person_id());

-- Future private domain (not created in 0001):
--   PrivateSession(session_id, person_id, stage, retention_mode, ...);
--   PrivateTurn / PrivateSummary
--   MemoryItem(person_id, visibility DEFAULT PRIVATE, epistemic_type, ...);

-- Future consent / shared (gateway sole writer from private):
--   ConsentRecord(...);
--   AbstractSignal(relationship_id, dimension, ..., contributing_person_id restricted);
--   SharedArtifact

CREATE INDEX idx_membership_person ON membership(person_id);
CREATE INDEX idx_membership_relationship ON membership(relationship_id);
CREATE INDEX idx_invite_relationship ON invite(relationship_id);
