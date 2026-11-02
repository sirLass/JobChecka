# @jobsafe/web — Dashboard + API (Phase 1)

Next.js App Router dashboard for **JobSafe Tracker**: sign in, save jobs by
pasting the post, track application status, export or delete your data.
Companion to `DOCUMENTATION/IMPLEMENTATION_PLAN.md` (Phase 1, Section 4) and the
Supabase runbook `DOCUMENTATION/supabase-setup.md`.

## Stack

- **Next 16** (App Router, Turbopack, `proxy.ts` for session refresh + redirects)
- **Tailwind CSS v4**, shadcn-style local components (`components/ui/`)
- **Supabase** (`@supabase/ssr` cookie sessions, magic-link auth, RLS everywhere)
- **Zod 4** validation on every API route + per-user rate limiting

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

## API endpoints (implemented in Phase 1)

| Method           | Path                           | Purpose                                   |
| ---------------- | ------------------------------ | ----------------------------------------- |
| POST             | `/api/auth/magic-link`         | Request a sign-in email (rate limited)    |
| GET              | `/auth/callback`               | Exchange the one-time code for a session  |
| POST             | `/auth/signout`                | Clear the session cookies                 |
| GET/POST/DELETE  | `/api/jobs`                    | List (filters/page) · create · delete ALL |
| GET/PATCH/DELETE | `/api/jobs/:id`                | Detail · edit/status/notes · delete       |
| POST             | `/api/reports`                 | Scam / false-alarm report (internal)      |
| GET              | `/api/export?format=csv\|json` | Download your data                        |
| DELETE           | `/api/account`                 | Permanently delete the account (cascades) |

All routes require auth, validate with Zod, cap description at 20,000 chars,
and apply a per-user rate limit (in-memory brake; durable store for the hard
caps comes in Phase 5).

## Deliberately NOT in Phase 1

- Scam rule engine + check results (`scam_checks` rows start in Phase 2)
- Groq AI explanations and the background worker (Phase 4/7.6)
- Extension capture + session hand-off (Phase 3)
