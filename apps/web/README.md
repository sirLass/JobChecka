# @jobsafe/web — Dashboard + API (Phase 1 + Phase 2)

Next.js App Router dashboard for **JobSafe Tracker**: sign in, save jobs by
pasting the post, track application status, see an instant rules-based scam
check with quoted evidence, export or delete your data.
Companion to `DOCUMENTATION/IMPLEMENTATION_PLAN.md` (Phases 1–2) and the
Supabase runbook `DOCUMENTATION/supabase-setup.md`.

## Stack

- **Next 16** (App Router, Turbopack, `proxy.ts` for session refresh + redirects)
- **Tailwind CSS v4**, shadcn-style local components (`components/ui/`)
- **Supabase** (`@supabase/ssr` cookie sessions, magic-link auth, RLS everywhere)
- **Zod 4** validation on every API route + per-user rate limiting
- **Rule engine** (Phase 2): `lib/scam/` — deterministic, no AI, unit tested
  against `eval/dataset`

## Quick start

1. **Create the Supabase dev project** — follow `DOCUMENTATION/supabase-setup.md`
   (dev + prod projects, email auth on).
2. **Fill in the root `.env`** (single source for the whole repo; modeled by
   `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # needed for self-service account deletion
   ```
   `next.config.mjs` loads these from the repo root; real `process.env` wins if set.
3. **Apply the schema** — run `apps/web/supabase/migrations/0001_phase1_schema.sql`
   in the SQL editor of the dev project (creates tables, indexes, triggers, and
   RLS policies).
4. **Allow the auth redirect** — Supabase Dashboard → Authentication → URL
   Configuration → add `http://localhost:3000/**` to Redirect URLs (and your
   production URL when deployed).
5. **Run** the dashboard:
   ```
   pnpm install
   pnpm dev:web        # http://localhost:3000
   ```
   Typecheck / lint / build: `pnpm typecheck` / `pnpm lint` / `pnpm build:web`.

## What to test (Phase 1 exit criteria)

- Open the site on **phone and desktop** → you land on login, magic link email arrives
- **Add a job** (paste a post) → redirected to the detail page with the snapshot
- Change **status** and **notes** on the detail page → survive reload
- **Filters and search** on the list (source, status, text)
- **Export** CSV + JSON from Settings
- **Delete all jobs** and **delete account** (needs `SUPABASE_SERVICE_ROLE_KEY`)

## RLS tests

`apps/web/scripts/rls-test.mjs` signs up two throwaway users and verifies user B
cannot read/change/delete user A's rows (and cannot forge A's `user_id`).

```
node apps/web/scripts/rls-test.mjs
```

Dev-project auth settings required to run: **Confirm email = OFF**, new users
allowed. With `SUPABASE_SERVICE_ROLE_KEY` set it also cleans up the users.
Exit code 0 → all attacks blocked.

## Scam checks (Phase 2)

Saving a job (paste **or** capture) runs the deterministic rules engine and
writes a `scam_checks` row (status `done`, `used_ai: false`). The job detail
page shows the verdict — `Warning signs found` / `Some warning signs` /
`No red flags found` — with the exact quoted evidence per rule, plus official
verification links (SEC, DMW, JobStreet safety guide) and the standard limits
statement. The engine never calls anything "safe" and never accuses a company.

- `POST /api/jobs` → returns `{ job, check, status: "saved" }` (check = rules result)
- `GET /api/jobs/:id` → returns `{ job, check }` (latest check row)
- Rules + combiner: `lib/scam/rules.ts`, `lib/scam/score.ts`
- Salary sanity: `lib/scam/salary.ts` + `lib/scam/salary-reference.json`
  (role-family bands in monthly PHP; only offers > 2× ceiling get flagged)
- Verification links: `lib/verification/links.ts`
- Tuning/eval: `pnpm eval` (repo root) runs `eval/run-eval.ts` over
  `eval/dataset` and prints recall / legit-high-risk numbers. Report-only.

Rule outputs per job are stored in `scam_checks.rules_fired` (JSONB) so later
phases (AI explanation, re-run button) can reuse them without recomputing.

## API endpoints (implemented in Phase 1 + Phase 2)

| Method           | Path                           | Purpose                                                 |
| ---------------- | ------------------------------ | ------------------------------------------------------- |
| POST             | `/api/auth/magic-link`         | Request a sign-in email (rate limited)                  |
| GET              | `/auth/callback`               | Exchange the one-time code for a session                |
| POST             | `/auth/signout`                | Clear the session cookies                               |
| GET/POST/DELETE  | `/api/jobs`                    | List (filters/page) · create · delete ALL               |
| GET/PATCH/DELETE | `/api/jobs/:id`                | Detail (with latest check) · edit/status/notes · delete |
| POST             | `/api/reports`                 | Scam / false-alarm report (internal)                    |
| GET              | `/api/export?format=csv\|json` | Download your data                                      |
| DELETE           | `/api/account`                 | Permanently delete the account (cascades)               |

All routes require auth, validate with Zod, cap description at 20,000 chars,
and apply a per-user rate limit (in-memory brake; durable store for the hard
caps comes in Phase 5).

## Deliberately NOT in Phase 1–2

- Groq AI explanations, tool checks, and the background worker (Phase 4/7.6) —
  the check is rules-only for now; the `scam_checks` row already carries the
  fields (`result`, `tool_results`, `model`, retries) so the upgrade path is
  pure Phase 4 work
- Extension capture + session hand-off (Phase 3)
