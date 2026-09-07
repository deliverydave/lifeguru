import type { AbstractDimension, EpistemicType, SessionStage, ShareDecision, Visibility } from "./enums.js";

export type PersonId = string;
export type RelationshipId = string;

export interface Person {
  personId: PersonId;
  createdAt: string;
}

export interface Relationship {
  relationshipId: RelationshipId;
  status: "pending" | "active" | "frozen" | "archived";
}

export interface Membership {
  relationshipId: RelationshipId;
  personId: PersonId;
  joinedAt: string;
  leftAt?: string;
}

export interface PrivateMemoryCandidate {
  personId: PersonId;
  category: string;
  value: string;
  epistemicType: EpistemicType;
  visibility: Visibility;
}

export interface ShareSheetDecision {
  decision: ShareDecision;
  dimension?: AbstractDimension;
  explicitText?: string;
}

export interface CounselorContextAllowlist {
  ownerPersonId: PersonId;
  stage: SessionStage;
  ownerTurns: Array<{ role: "user" | "assistant"; text: string }>;
  ownerMemories: PrivateMemoryCandidate[];
  sharedArtifacts: Array<{ id: string; text: string }>;
  jointGoals: Array<{ id: string; title: string }>;
}
