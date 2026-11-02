/**
 * Product-wide constants. Sources: PRD sections 5.2, 6.2-6.4, 8; IMPLEMENTATION_PLAN sections 4, 8.
 */

/** Standard disclaimer appended to every check result (rules-only and AI). */
export const LIMITS_STATEMENT =
  "This checks the post text and a few public signals. It cannot confirm the employer is real.";

/** Absolute input size guard for post descriptions (IMPLEMENTATION_PLAN section 8). */
export const MAX_DESCRIPTION_LENGTH = 20_000;

/** Banned "safe"/"legit" terms that must never appear as claims in AI output (PRD 6.3 rule 3). Used by the code validator in Phase 4. */
export const BANNED_CLAIM_TERMS = [
  "safe",
  "legit",
  "legitimate",
  "verified",
  "fake",
  "scam",
  "scammer",
  "fraud",
  "fraudulent",
] as const;

/** Default per-user daily cap on AI checks; overridable via AI_DAILY_LIMIT_PER_USER env var. */
export const DEFAULT_AI_DAILY_LIMIT_PER_USER = 20;

/** Max tool rounds in the Groq tool-calling loop (IMPLEMENTATION_PLAN 7.1). */
export const MAX_TOOL_ROUNDS = 3;

/** Max tool calls per check (PRD 6.4). */
export const MAX_TOOL_CALLS_PER_CHECK = 5;

/** Background check target: rules instantly, AI report within this window (PRD 5.2.1). */
export const AI_CHECK_TARGET_SECONDS = 15;

/** Worker retry policy for background checks (PRD 5.2.1). */
export const CHECK_MAX_RETRIES = 2;

/** Job application statuses in display order (PRD user story: Saved/Applied/Interviewing/Offer/Rejected). */
export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

/** Supported sites for v1 capture (verify exact domains in Phase 3). */
export const SUPPORTED_SITES = {
  jobstreet: ["https://*.jobstreet.com.ph/*"],
  indeed: ["https://ph.indeed.com/*"],
} as const;

/** Deterministic rule ids used by the Phase 2 engine (PRD 5.2).
 *  These match `expected_flags` in eval/dataset per its README ground rules. */
export const RULE_IDS = [
  "fee_request",
  "off_platform_chat",
  "free_email",
  "email_website_mismatch",
  "unrealistic_pay",
  "vague_duties",
  "missing_identity",
  "urgency_pressure",
  "sensitive_data",
  "suspicious_link",
] as const;

/** Overall result levels for scam checks (scam_checks.risk_level, eval risk_label, UI badges). */
export const RISK_LEVELS = ["low_signals", "caution", "high_risk"] as const;
