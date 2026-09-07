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

export enum SessionStage {
  START = "START",
  CHECK_IN = "CHECK_IN",
  IDENTIFY_ISSUE = "IDENTIFY_ISSUE",
  EXPLORE_EVENT = "EXPLORE_EVENT",
  IDENTIFY_EMOTION = "IDENTIFY_EMOTION",
  IDENTIFY_NEED = "IDENTIFY_NEED",
  OBS_VS_INTERP = "OBS_VS_INTERP",
  PERSPECTIVE = "PERSPECTIVE",
  DESIRED_OUTCOME = "DESIRED_OUTCOME",
  CONTROLLABLES = "CONTROLLABLES",
  SMALL_ACTION = "SMALL_ACTION",
  WIND_DOWN = "WIND_DOWN",
  PRIVATE_SUMMARY = "PRIVATE_SUMMARY",
  CORRECTIONS = "CORRECTIONS",
  SHARING_DECISION = "SHARING_DECISION",
  SAFETY_HOLD = "SAFETY_HOLD",
  END = "END",
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
