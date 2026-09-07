export enum Visibility {
  PRIVATE = "PRIVATE",
  ABSTRACT_SHARED = "ABSTRACT_SHARED",
  SHARED_EXPLICIT = "SHARED_EXPLICIT",
  JOINT = "JOINT",
  SYSTEM_SAFETY = "SYSTEM_SAFETY",
}

export enum ShareDecision {
  KEEP = "KEEP",
  ABSTRACT = "ABSTRACT",
  EXPLICIT = "EXPLICIT",
}

export enum EpistemicType {
  FACT = "FACT",
  USER_REPORT = "USER_REPORT",
  INTERPRETATION = "INTERPRETATION",
  AI_HYPOTHESIS = "AI_HYPOTHESIS",
  SHARED_AGREEMENT = "SHARED_AGREEMENT",
}

/** M0 linear stages. 0001 aliases are listed in comments for migration alignment. */
export enum SessionStage {
  START = "START",
  CHECK_IN = "CHECK_IN",
  IDENTIFY_CURRENT_ISSUE = "IDENTIFY_CURRENT_ISSUE", // 0001: IDENTIFY_ISSUE
  EXPLORE_EVENT = "EXPLORE_EVENT",
  IDENTIFY_EMOTION = "IDENTIFY_EMOTION",
  IDENTIFY_UNDERLYING_NEED = "IDENTIFY_UNDERLYING_NEED", // 0001: IDENTIFY_NEED
  SEPARATE_OBSERVATION = "SEPARATE_OBSERVATION", // 0001: OBS_VS_INTERP
  PERSPECTIVE_TAKING = "PERSPECTIVE_TAKING", // 0001: PERSPECTIVE
  IDENTIFY_DESIRED_OUTCOME = "IDENTIFY_DESIRED_OUTCOME", // 0001: DESIRED_OUTCOME
  IDENTIFY_CONTROLLABLE = "IDENTIFY_CONTROLLABLE", // 0001: CONTROLLABLES
  CHOOSE_SMALL_ACTION = "CHOOSE_SMALL_ACTION", // 0001: SMALL_ACTION
  PRIVATE_SUMMARY = "PRIVATE_SUMMARY",
  OPTIONAL_SHARING = "OPTIONAL_SHARING", // 0001: SHARING_DECISION
  SAFETY_HOLD = "SAFETY_HOLD",
  END = "END",
  // 0001 legacy names (same values as mapped M0 stages where they differ)
  IDENTIFY_ISSUE = "IDENTIFY_ISSUE",
  IDENTIFY_NEED = "IDENTIFY_NEED",
  OBS_VS_INTERP = "OBS_VS_INTERP",
  PERSPECTIVE = "PERSPECTIVE",
  DESIRED_OUTCOME = "DESIRED_OUTCOME",
  CONTROLLABLES = "CONTROLLABLES",
  SMALL_ACTION = "SMALL_ACTION",
  WIND_DOWN = "WIND_DOWN",
  CORRECTIONS = "CORRECTIONS",
  SHARING_DECISION = "SHARING_DECISION",
}

export enum AbstractDimension {
  appreciation = "appreciation",
  affection = "affection",
  emotional_safety = "emotional_safety",
  quality_time = "quality_time",
  autonomy = "autonomy",
  household_contribution = "household_contribution",
  financial_security = "financial_security",
  sexual_connection = "sexual_connection",
  communication = "communication",
  trust = "trust",
}
