# Phase 0 Status — JobSafe Tracker

Name decision and phase checklist. Companion to `IMPLEMENTATION_PLAN.md` Section 3.
Updated: 2026-11-02.

## Product name — DECIDED: "JobSafe Tracker"

- **Decision:** the product is named **JobSafe Tracker** (full, three-word name in every
  user-facing surface; repo/package name stays `jobsafe`).
- **Conflicts found (2026-11-02):**
  - A Chrome extension named **"JobSafe"** already exists in the Chrome Web Store and is
    also a job-scam analyzer — close enough to be a confusion/impersonation risk and a
    possible store-review rejection for too-similar names.
  - Unrelated namesakes exist (a UK safety-systems company "JobSafe Ltd", a defunct
    Indian recruitment company, an academic project), none in this product category at
    consumer-facing scale except the extension above.
- **Mitigation plan:**
  - Always display the full name "JobSafe Tracker" (store listing, header, privacy
    notice); never just "JobSafe".
  - Check exact store-name availability (~"JobSafe Tracker") when the listing is
    prepared in Phase 3; if taken, fallback names prepared: "JobWarn PH", "ScamWatch
    Jobs PH" (keep the decision up to date here).
  - Domain: check `jobsafetracker.com` / `.ph` availability before store submission;
    `.app`/`.dev` alternatives acceptable, a domain is not required for store review.
  - ToS-review.md already carries the "independent tool, not affiliated" disclaimer that
    supports the distinct-name position.

## Checklist (Phase 0: Foundations)

Statuses: [x] done · [~] drafted here, user action remains · [ ] pending · [n/a]

| # | Item | Status | Where / what remains |
| --- | -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- || 1 | Read and record ToS for JobStreet PH and Indeed PH | ~ | [`ToS-review.md`](ToS-review.md) complete as a review: both terms read (live, versioned), conclusions and accepted risks recorded, including the Indeed General Terms anti-scraping clause found in Section D. **Remaining:** user read-through/sign-off on the record table before public beta. |
| 2 | Identify official verification sources (SEC, DMW, DOLE) | x | [`verification-sources.md`](verification-sources.md) — SEC (checkwithsec / CRS), DMW licensed agencies + advisories, DOLE news warnings. None offer documented public APIs; tools will deep-link for the user, not scrape. |
| 3 | Draft privacy policy and terms of use | ~ | Drafts: [`privacy-policy-draft.md`](privacy-policy-draft.md), [`terms-of-use-draft.md`](terms-of-use-draft.md). **Remaining:** legal review (PH Data Privacy Act), NPC registration, real contact mailbox before any public listing. |
| 4 | Decide product name; check domain + Chrome Web Store conflicts | ~ | Name decided: **JobSafe Tracker** (above). **Remaining:** check exact store-name availability and domain at Phase 3 submission time. |
| 5 | Groq account; test tool-calling with 2–3 models; pick one | ~ | Zero-dependency benchmark script exists: `pnpm test:groq` (`tools/groq-model-test.mjs`). **Remaining (user):** create Groq account, set `GROQ_API_KEY` in `.env`, run the benchmark, record the winning model, keep it configurable via `GROQ_MODEL`. |
| 6 | Supabase dev + prod projects, email auth | ~ | Runbook ready: [`supabase-setup.md`](supabase-setup.md) (15-min task, free tier, ap-southeast-1). **Remaining (user):** create `jobsafe-dev` and `jobsafe-prod`, enable email/magic-link auth, fill `.env`. |
| 7 | Repo, linting, formatting, CI, secrets handling | x | pnpm workspace, ESLint + Prettier, typecheck, Vitest, gitleaks in `.github/` CI; secrets only in gitignored `.env` modeled by `.env.example`. |
| 8 | Threat model | x | [`threat-model.md`](threat-model.md) — assets, adversaries, T1–T8 with mitigations; revisit per phase. |
| 9 | Evaluation dataset: 50 scam + 50 legit posts | ~ | Scaffold + format + collection process: [`eval/dataset/README.md`](../eval/dataset/README.md). **Remaining:** collect and label the 100 anonymized examples (user/manual work, ~1–2 evenings). |

## Exit criteria check (plan Section 3)

- [~] ToS reviewed → reading and analysis complete (JobStreet full via live page;
  Indeed Sections A–B directly, Section D restrictions clause located and quoted); only
  the user sign-off remains.
- [x] Sources identified.
- [~] Model chosen → procedure ready, run pending API key.
- [x] Repo and CI running (this repo).
- [~] Privacy/ToS drafts exist; legal review pending.
- [ ] 100-post eval dataset collected.

## What only you (the human) can do next

1. Supabase: follow `supabase-setup.md` (15 min).
2. Groq: create account, paste `GROQ_API_KEY` into `.env`, run `pnpm test:groq`.
3. Read `ToS-review.md` and sign the review record (the analysis itself is done).
4. Collect eval examples per `eval/dataset/README.md`.
5. Have privacy policy + terms reviewed; register with the NPC.
