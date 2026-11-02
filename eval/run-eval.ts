/**
 * Scam-rule eval runner (plan section 4, Phase 2 task).
 *
 * Runs the rules engine over every labeled post in eval/dataset and reports,
 * per the dataset README ground rules:
 *   - scam posts: every `expected_flags` entry must fire and the level must
 *     reach the expected level (currently high_risk);
 *   - legit posts: expected flags (when labeled) must fire, the level must be
 *     exactly the expected level in the seed set, and a legit post MUST NEVER
 *     reach high_risk unless its label says so (blocker).
 *
 * Report-only: always exits 0 so CI tracks the trend instead of gating on the
 * current 24 synthetic seeds. The real 50+50 real-post dataset (dataset README)
 * becomes the measured gate later.
 *
 * Runs under Node's built-in TypeScript stripping: plain ESM imports, only
 * erasable TS syntax. Library files keep explicit .ts import extensions.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Relative source import: the runner is outside the apps/web package, where the
// @jobsafe/shared package name would not resolve under Node's strip-types mode.
import { RISK_LEVELS } from "../packages/shared/src/index.ts";
import { runRules } from "../apps/web/lib/scam/rules.ts";
import { combineRisk } from "../apps/web/lib/scam/score.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATASET_DIR = path.join(here, "dataset");

interface RawSeed {
  id: string;
  labels?: string[];
  label?: string;
  risk_label?: string;
  expected_flags?: string[];
  expected_min_level?: string;
  title?: string;
  company_name?: string;
  company?: string;
  description: string;
  contact_text?: string;
  contact?: string;
  salary_text?: string;
}

interface CaseResult {
  id: string;
  isScam: boolean;
  level: string;
  fired: string[];
  expectedFlags: string[];
  missingFlags: string[];
  extraFlags: string[];
  expectedLevel: string | null;
  status: "PASS" | "FAIL" | "WARN" | "SKIP";
  reasons: string[];
}

function loadSeeds(file: string): RawSeed[] {
  const raw = readFileSync(path.join(DATASET_DIR, file), "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RawSeed);
}

function truncate(text: string, max = 96): string {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

function evaluate(seed: RawSeed): CaseResult {
  const isScam = (seed.risk_label ?? seed.label ?? "").toLowerCase() === "scam";
  const expectedFlags = seed.expected_flags ?? seed.labels ?? [];
  // Seeds carry expected_min_level; the dataset README shape uses risk_label.
  const expectedLevel =
    seed.expected_min_level ??
    (RISK_LEVELS.includes(seed.risk_label as (typeof RISK_LEVELS)[number])
      ? seed.risk_label
      : null);

  const post = {
    title: seed.title || undefined,
    company: (seed.company_name ?? seed.company ?? "") || undefined,
    description: seed.description,
    contact: (seed.contact_text ?? seed.contact ?? "") || undefined,
    salaryText: seed.salary_text || undefined,
  };

  const hits = runRules(post);
  const level = combineRisk(hits);
  const fired = hits.map((hit) => hit.id);
  const missingFlags = expectedFlags.filter((flag) => !fired.includes(flag));
  const extraFlags = fired.filter((flag) => !expectedFlags.includes(flag));

  const reasons: string[] = [];
  let status: CaseResult["status"] = "PASS";

  if (missingFlags.length > 0) {
    status = "FAIL";
    reasons.push(`missed expected flags: ${missingFlags.join(", ")}`);
  }

  if (isScam) {
    if (expectedLevel && level !== expectedLevel) {
      status = "FAIL";
      reasons.push(`level ${level} below expected ${expectedLevel}`);
    }
  } else if (expectedLevel) {
    if (level === "high_risk") {
      status = "FAIL";
      reasons.push("legit post reached HIGH risk (blocker)");
    } else if (level !== expectedLevel) {
      status = status === "FAIL" ? "FAIL" : "WARN";
      reasons.push(`level drift: ${level} vs expected ${expectedLevel}`);
    }
  }
  if (status !== "FAIL" && extraFlags.length > 0) {
    status = "WARN";
    reasons.push(`extra flags: ${extraFlags.join(", ")}`);
  }

  return {
    id: seed.id,
    isScam,
    level,
    fired,
    expectedFlags,
    missingFlags,
    extraFlags,
    expectedLevel,
    status,
    reasons,
  };
}

function main(): number {
  const seeds = [...loadSeeds("scam.jsonl"), ...loadSeeds("legit.jsonl")];
  const results = seeds.map(evaluate);

  console.log("\nJobSafe Tracker — scam rule eval (rules engine vs eval/dataset)");
  console.log("=".repeat(78));
  for (const result of results) {
    const marker = result.status === "PASS" ? "✓" : result.status === "FAIL" ? "✗" : "!";
    const wide = (result.id + " ").padEnd(11, ".");
    console.log(
      `${marker} ${wide} ${result.level.padEnd(11)} flags: ${result.fired.join(", ") || "-"}`,
    );
    for (const reason of result.reasons) {
      console.log(`     ↳ ${reason}`);
    }
    if (result.status === "FAIL") {
      const seed = seeds.find((s) => s.id === result.id);
      if (seed) console.log(`     ↳ post: ${truncate(seed.description)}`);
    }
  }

  const scamResults = results.filter((r) => r.isScam);
  const legitResults = results.filter((r) => !r.isScam);
  const scamSeeded = scamResults.filter(
    (r) => !r.expectedLevel || r.level === r.expectedLevel,
  ).length;
  const expectedFlagTotal = results.reduce((sum, r) => sum + r.expectedFlags.length, 0);
  const flaggedAsExpected =
    expectedFlagTotal - results.reduce((sum, r) => sum + r.missingFlags.length, 0);
  const legitHigh = legitResults.filter((r) => r.level === "high_risk").length;
  const warns = results.filter((r) => r.status === "WARN").length;

  console.log("=".repeat(78));
  console.log(`Scam posts reaching expected level: ${scamSeeded}/${scamResults.length}`);
  console.log(`Expected flags fired:              ${flaggedAsExpected}/${expectedFlagTotal}`);
  console.log(`Legit posts reaching HIGH risk:    ${legitHigh}/${legitResults.length} (target: 0)`);
  console.log(`Seeds with extra-flag warnings:     ${warns}/${results.length}`);
  console.log(`Levels used: ${RISK_LEVELS.join(" < ")} — dataset grows this to 50+50 real posts.`);
  console.log("Report-only (exit 0). See DOCUMENTATION/phase-2-status.md for the plan gate.");
  return 0;
}

process.exitCode = main();
