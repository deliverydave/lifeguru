-- 0003_m1_auth_linking.sql
-- M1 auth + relationship linking. Runtime remains in-memory (optional JSON file).
-- Cloud SQL is out of scope; this file documents the schema + RLS sketches.
-- Repository filters in apps/api/src/repo-filters.mjs enforce the same person scoping.

-- Membership states: invited / active / left
DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('invited', 'active', 'left');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE membership
  ADD COLUMN IF NOT EXISTS status membership_status NOT NULL DEFAULT 'active';

-- Invite one-time use + expiry (0001 already has expires_at / status)
ALTER TABLE invite
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invite_token_hash ON invite(token_hash);
CREATE INDEX IF NOT EXISTS idx_invite_expires ON invite(expires_at);

-- Disclaimer acceptances (privacy explainer + coaching-not-therapy)
CREATE TABLE IF NOT EXISTS disclaimer_acceptance (
  acceptance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES person(person_id),
  disclaimer_key TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, disclaimer_key, version)
);

CREATE INDEX IF NOT EXISTS idx_disclaimer_person ON disclaimer_acceptance(person_id);

-- ---------------------------------------------------------------------------
-- RLS / policy sketches (enable when auth.person_id() exists from Clerk map)
-- identity_person_map is Auth/Map service only — never expose to counseling reads.
-- ---------------------------------------------------------------------------

-- ALTER TABLE identity_person_map ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY identity_map_service_only ON identity_person_map
--   USING (false);  -- no counseling-role SELECT; provisioner uses service role

-- ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY membership_self ON membership
--   USING (person_id = auth.person_id());

-- ALTER TABLE relationship ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY relationship_member ON relationship
--   USING (EXISTS (
--     SELECT 1 FROM membership m
--     WHERE m.relationship_id = relationship.relationship_id
--       AND m.person_id = auth.person_id()
--       AND m.status <> 'left'
--   ));

-- ALTER TABLE invite ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY invite_member ON invite
--   USING (EXISTS (
--     SELECT 1 FROM membership m
--     WHERE m.relationship_id = invite.relationship_id
--       AND m.person_id = auth.person_id()
--       AND m.status = 'active'
--   ));

-- ALTER TABLE disclaimer_acceptance ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY disclaimer_self ON disclaimer_acceptance
--   USING (person_id = auth.person_id());

-- Private session/turn (from 0002 comments) must stay owner-scoped:
--   USING (person_id = auth.person_id());
-- Never grant partner SELECT on private_session / private_turn / memory_item.
