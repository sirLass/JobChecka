/**
 * Core domain types shared by the dashboard, extension, rules engine, and AI layer.
 * Keep this file dependency-free (no imports) so every app can use it.
 */

/** Severity of a single rule hit or red flag. */
export type Severity = "low" | "medium" | "high";

/** Overall risk level shown to users. Terms are deliberately descriptive, never "scam"/"safe". */
export type RiskLevel = "low_signals" | "caution" | "high_risk";

/** Model/system confidence in its own output. */
export type Confidence = "low" | "medium" | "high";

/** Application pipeline status tracked by the user. */
export type ApplicationStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected";

/** Where the job post came from. */
export type JobSource = "jobstreet" | "indeed" | "manual";

/** Lifecycle of a scam check row. */
export type CheckStatus = "pending" | "running" | "done" | "failed";

/** A deterministic rule result from the rules engine (Phase 2). */
export interface RuleHit {
  /** Stable rule id, e.g. "fee_request". */
  id: string;
  severity: Severity;
  /** Exact quote from the post that triggered the rule. */
  evidence: string;
  /** Plain-language explanation shown to the user. */
  explanation: string;
}

/** The input text of a job post to be checked. */
export interface Post {
  title?: string;
  company?: string;
  description: string;
  contact?: string;
  salaryText?: string;
  /** Employer website or posting link, when known (source_url in the jobs table). */
  sourceUrl?: string;
}

/** A single red flag produced by the AI explanation layer. */
export interface RedFlag {
  issue: string;
  /** Must be an exact quote from the post text or a tool result; validated in code. */
  evidence: string;
  severity: Severity;
}

/** Validated output shape (PRD 6.2). Validation lives with Zod in the web app; this is the shared shape. */
export interface CheckResult {
  risk_level: RiskLevel;
  confidence: Confidence;
  red_flags: RedFlag[];
  missing_info: string[];
  positive_signs: string[];
  what_to_do: string[];
  limits: string;
}

/** Fields captured from a job page or manual paste (PRD 5.1). */
export interface CapturedJob {
  source_platform: JobSource;
  source_url?: string;
  title?: string;
  company_name?: string;
  location?: string;
  work_type?: string;
  salary_text?: string;
  description: string;
  contact_text?: string;
  /** sha256 of normalized title + company + description (see content-hash.ts). */
  content_hash: string;
  captured_at: string;
  /** Version string of the site adapter that produced this capture, when applicable. */
  adapter_version?: string;
}

/** Normalized identity keys used for user reports and warning-list matching. */
export interface ReportKey {
  company_key?: string;
  domain_key?: string;
  contact_key?: string;
}

/** A user-submitted report ("scam" = confirming suspicion, "false_alarm" = warning was wrong). */
export interface UserReport {
  kind: "scam" | "false_alarm";
  reason?: string;
  keys: ReportKey;
}

/** A loaded entry from an official warning or licensed-agency list (Phase 0 sources doc). */
export interface WarningListEntry {
  list_name: string;
  source_url: string;
  entry_key: string;
  entry_raw: string;
}
