# Phase 1 Status — JobSafe Tracker (Dashboard + Auth + Data)

Companion to `IMPLEMENTATION_PLAN.md` Section 4 and `phase-0-status.md`.
Updated: 2026-11-02.

## Summary

The Phase 1 build is **landed in `apps/web`** and verified by CI-equivalent checks
(typecheck, lint, format, Vitest, production `next build`). It cannot run end-to-end
until the Supabase dev project exists and `.env` is filled — that is the remaining
user-side work (15 min, runbook below).

## Checklist (plan Section 4.2)

Statuses: [x] done · [~] built here, needs hardware/credentials to verify · [ ] not started

| Item                                              | Status | Where / what remains                                                                                                                                                                                                  |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js app, Tailwind, mobile-first layout        | x      | `apps/web` — Next 16 + Tailwind 4, shadcn-style `components/ui`, responsive list (cards on mobile, table on desktop)                                                                                                  |
| Supabase auth (magic link), protected routes      | ~      | `/login` form → `POST /api/auth/magic-link` → `/auth/callback` exchange; `proxy.ts` refreshes tokens and guards `/dashboard` + `/settings`. **Remaining:** needs Supabase project + "Redirect URLs" configured to run |
| Jobs list, filters and search                     | x      | `app/dashboard/page.tsx` — text search, source + status filters, pagination                                                                                                                                           |
| Job detail page                                   | x      | `app/dashboard/jobs/[id]/page.tsx` — snapshot, status control, notes, delete; scam-checks panel is a Phase 2 placeholder                                                                                              |
| Add job manually / paste post                     | x      | `/dashboard/new` + `POST /api/jobs` (Zod, 20k char cap, per-user rate limit, `content_hash` stored via `@jobsafe/shared`)                                                                                             |
| Settings: export, delete all jobs, delete account | ~      | Export CSV/JSON streams all rows; delete-all and delete-account are two-step confirms. **Remaining:** delete-account needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`                                                      |
| API routes with Zod + auth checks                 | x      | Section 8 endpoints implemented (jobs CRUD, reports, export, account); all validated with Zod, session-scoped via RLS                                                                                                 |
| RLS tests: user A cannot read user B's rows       | ~      | Script ready: `node apps/web/scripts/rls-test.mjs` (signs up 2 throwaway users, 9 positive/cross-user checks). **Remaining:** run it against the dev project (Confirm email = OFF in dev auth settings)               |
| Accessibility pass                                | ~      | Labels on every control, keyboard-friendly native controls, focus-visible outlines, `aria-live` status text, semantic table/media queries. **Remaining:** real screen-reader / phone pass during Supabase testing     |

## Migration work

- `apps/web/supabase/migrations/0001_phase1_schema.sql` — jobs, applications,
  scam_checks, reports, warning_lists, indexes, `updated_at` trigger, RLS policies
  (warning_lists intentionally has no user-facing policy).
- **Apply it** in the SQL editor of the dev project when it exists.

## Exit criteria check (plan Section 4)

- [~] Sign in on phone and desktop → app built; blocked on Supabase project + `.env`
- [ ] Add a job, change status, export, delete → run through the checklist in
      `apps/web/README.md` ("What to test") once `.env` is filled

## What only you (the human) can do next

1. Create the Supabase dev + prod projects — `DOCUMENTATION/supabase-setup.md` (15 min).
2. Run `0001_phase1_schema.sql` in the dev SQL editor.
3. Copy `.env.example` → `.env`, fill the three Supabase keys; add
   `http://localhost:3000/**` to Auth → Redirect URLs.
4. `pnpm dev:web` and walk the "What to test" list in `apps/web/README.md`.
5. Run `node apps/web/scripts/rls-test.mjs` and paste the result back.

## Phase 0 carry-overs (unchanged)

- Supabase (above) also completes Phase 0 item 6.
- Groq model test, ToS sign-off, eval dataset collection, legal review — same
  sequencing as in `phase-0-status.md` (needed by Phases 2–5, not by this phase).
