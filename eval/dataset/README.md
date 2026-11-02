# Eval Dataset (Phase 0)

Product: **JobSafe Tracker**. Purpose: measurable "does it flag real scams and not flag
real jobs" proof before and during Phase 1+. This directory holds labeled examples.

## Goals

- Measure at least 50 scam-style and 50 legitimate-style job posts.
- Each example is a REAL post, anonymized (names/numbers/contact details replaced with
  equivalents; keep the scam patterns intact — that is the signal).
- Balanced enough to measure both directions: precision (how few legit posts get flags)
  and recall (how many scam posts get flags).

## File format

One JSON object per line (JSONL) in `dataset/scam.jsonl` and `dataset/legit.jsonl`.
Schema (aligns with `packages/shared` types once Phase 1 lands):

```json
{
  "id": "scam-001", // unique, stable string
  "platform": "jobstreet", // "jobstreet" | "indeed" | "manual"
  "title": "Earn 1500/day - no experience",
  "company_name": "ACME Hiring Group",
  "location": "Quezon City",
  "work_type": "full-time",
  "salary_text": "PHP 25,000 - 45,000 monthly",
  "description": "the full post text (anonymized)",
  "contact_text": "Contact: 09xx-xxx-xxxx or hiring.acme@gmail.com",
  "source_url": null, // strip or fake URLs; do not leave live scams clickable
  "labels": ["no_specs_of_actual_job", "free_gmail_address", "too_good_to_be_true_salary"],
  "risk_label": "high_risk", // ground truth: "low_signals" | "caution" | "high_risk"
  "added": "2026-11-02",
  "notes": "why this label was given, anything tricky"
}
```

Rules:

- `labels` are the known expected triggers, so failures name WHAT the engine missed.
- Never put real people's names, phone numbers, or emails in a file — replace them
  (e.g. `09xx-xxx-xxxx`, `hr.fakeco@gmail.com`).
- Legit examples can still trip ONE mistake-prone rule on purpose (label a legit post
  with the rule you EXPECT it to trip, e.g. "pays_weekly" does not equal scam) — this
  tracks false positive quality as long as `risk_label` stays `no_signals` or `caution`.

## Process for collecting

1. Aim: 50 scam-style from real "the job went wrong" narratives (Reddit/PH job groups,
   anonymized), 50 legitimate-style from (anonymized) real posting samples across
   industries/platforms.
2. Add DMW-advisory-derived examples to the scam pool when names are generic enough.
3. Record every example's date captured; posting-style language changes fast (slang,
   platform fee-wording updates), so old examples get stale — mark examples older than a
   year for re-review.

## Ground rules

- The enum values of `risk_label` MUST match `packages/shared` constants. Change the
  schema there first, never in just one place.
- `eval/run-eval.ts` (Phase 1+) reads this directory; do not rename the files silently.
- Nothing in this directory goes public; even anonymized data leaves the product rarely.
- Add at least a few "obviously borderline" examples (mixed signals) — the product's
  honesty about uncertainty is the thing being tested most.
