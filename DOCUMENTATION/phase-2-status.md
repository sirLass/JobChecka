# Phase 2 Status — Rule Engine + Verification Links

**Status: code complete, checks green, pushed. Phase 2 of**
`DOCUMENTATION/IMPLEMENTATION_PLAN.md` **(Section 4)**.

## What shipped

- **Rules engine** (`apps/web/lib/scam/rules.ts`): all 10 PRD 5.2 rules —
  `fee_request`, `off_platform_chat`, `free_email`, `email_website_mismatch`,
  `unrealistic_pay`, `vague_duties`, `missing_identity`, `urgency_pressure`,
  `sensitive_data`, `suspicious_link` — each returning at most one hit with
  severity + a **verbatim evidence snippet** quoted from the post. Pure
  functions, no network, no AI.
- **Score combiner** (`lib/scam/score.ts`): any high hit → `high_risk`; any
  medium hit → `caution`; else `low_signals`. `confidenceFor()` maps the level
  to the `scam_checks.confidence` column.
- **Salary sanity check** (`lib/scam/salary.ts` +
  `lib/scam/salary-reference.json`): parses PHP/USD salary wording into a
  monthly-PHP equivalent (day×22, week×4.33, hour×176 working factors, fixed
  USD rate with source note), matches a role family, and flags only offers
  > 2× (medium) / > 3× (high) the family ceiling. Fee-style amounts
  > ("registration fee of P850") and dash-chained phone numbers never read as
  > wages; ranges anchor on the top of the range.
- **Verification links** (`lib/verification/links.ts`): official pages only
  (SEC checker, DMW licensed-agencies + advisories for abroad/agency posts,
  JobStreet safety guide, DOLE fallback), max 4, no scraping.
- **Integration**: `POST /api/jobs` saves the job, runs rules, and writes the
  `scam_checks` row (status `done`, `used_ai: false`) → returns `{ job, check }`;
  `GET /api/jobs/:id` and the job detail page surface the latest check. Detail
  page (`components/scam-check-panel.tsx`) shows the verdict ("Warning signs
  found" / "Some warning signs" / "No red flags found"), per-rule evidence with
  explanations, verification links, and the required limits statement.
- **Eval runner**: `pnpm eval` → `eval/run-eval.ts` runs the engine over
  `eval/dataset` (24 synthetic seeds today; README documents the 50+50 real-post
  format). Report-only, exit 0, wired into CI.

## Checks

- `pnpm typecheck` / `lint` / `format:check` ✅
- `pnpm test` — 70 tests ✅ (rules, salary parser, combiner, links, Phase 1 suites)
- `node eval/run-eval.ts` ✅ — see numbers below
- `pnpm build:web` ✅ (Turbopack; JSON reference imported with
  `with { type: "json" }`)

## Eval numbers (24 synthetic seeds; NOT the real 50+50 gate)

| Measure                            | Result                                         |
| ---------------------------------- | ---------------------------------------------- |
| Scam posts reaching expected level | 12/12                                          |
| Expected flags fired               | 25/25                                          |
| Legit posts reaching HIGH risk     | 0/12 (target 0)                                |
| Seeds with extra-flag warnings     | 8/24 (extra hits allowed; tracked as warnings) |

Extra flags are informative, not failures: e.g. `scam-003` also fires
`missing_identity` (true — the post names no verifiable identity), and
`legit-001`-style no-fee statements correctly stay silent.

## Design notes (recorded for later phases)

- One hit per rule id; evidence is always an exact substring of the checked
  text — asserted in tests for every dataset seed.
- `off_platform_chat` escalates to HIGH when the interview/processing happens
  inside the chat app, the account is personal, or the chat app is the only
  verifiable contact channel (PRD: "Messenger-only contact"). A walk-in branch
  interview keeps it medium (legit-007 case).
- Fee wording is sentence-scoped with a negation guard ("never collects fees",
  "walang hininging bayad"); single "fee"/"bayad" words alone are not triggers.
- Wordings follow PRD 6.3: the panel says "warning signs", never "scam",
  never "safe", and never accuses a named company.
- `ScamCheckPanel` is a server component; Phase 4 AI output can extend it
  without changing the data contract.

## Exit criteria status

Plan gate: "pasting a known scam-style post shows a clear warning with quoted
evidence; legitimate sample posts rarely trigger High risk."

- Rule engine + evidence + links + panel: **done in code**; live exercise
  blocked on the Supabase dev project (same Phase 1 blocker — `.env` + schema
  apply + `http://localhost:3000/**` redirect).
- "Rarely trigger High risk": demonstrated over the 24 synthetic seeds (0/12);
  the real 50+50 dataset is the actual measurable gate and still needs
  collection by the user (dataset README process).

## Still open (user)

1. Supabase setup (`DOCUMENTATION/supabase-setup.md`) → Phase 1 exit criteria
   exercise (sign in → add job → status → export → delete; RLS script).
2. Collect the 50+50 real eval posts (`eval/dataset/README.md`).
3. Then Phase 3 (extension capture) can reuse `extract-contacts.ts` + rules.
