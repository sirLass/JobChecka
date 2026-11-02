/**
 * Score combiner (plan section 4, Phase 2 task): turn rule hits into a single
 * overall level (`low_signals | caution | high_risk`) so the UI, the DB and the
 * eval all share one vocabulary. Values come from `RISK_LEVELS` in
 * `@jobsafe/shared` (eval/dataset README ground rule).
 */

import { RISK_LEVELS } from "@jobsafe/shared";
import type { RuleHit, Severity } from "./rules.ts";

export type RiskLevel = (typeof RISK_LEVELS)[number];

/**
 * Risk ladder: "low_signals" < "caution" < "high_risk".
 * Any single strong (high) hit lifts the verdict to high_risk; any medium hit
 * earns caution; only a completely clean post stays at low_signals. A one-signal
 * caution matches the eval seeds (legit posts that trip exactly one borderline
 * rule must stay under high_risk — plan exit criterion).
 */
export function combineRisk(hits: RuleHit[]): RiskLevel {
  if (hits.some((hit) => hit.severity === "high")) return "high_risk";
  if (hits.some((hit) => hit.severity === "medium")) return "caution";
  return "low_signals";
}

/**
 * Confidence that the rules-based verdict is complete-ish, shown with the
 * result. Rules see only text, so confidence tracks how much signal there was
 * rather than guaranteeing anything about the employer.
 */
export function confidenceFor(level: RiskLevel): "high" | "medium" | "low" {
  if (level === "high_risk") return "high";
  if (level === "caution") return "medium";
  return "low";
}

/** Severity ordered by strength; used by the eval summary and UI sorting. */
export function severityRank(severity: Severity): number {
  return severity === "high" ? 2 : severity === "medium" ? 1 : 0;
}
