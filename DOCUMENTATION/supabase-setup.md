# Supabase Setup Runbook (Phase 0)

Phase 0 requires dev + prod projects with email auth enabled. Creating the projects needs your
Supabase account; everything else is documented here so it is a 15-minute task.

## 1. Create the projects

1. Sign in at https://supabase.com (or create a free account).
2. Check existing org or create one (e.g. `jobsafe`).
3. Create project #1: name `jobsafe-dev`, region closest to users: `ap-southeast-1 (Singapore)`.
   Set a strong database password and SAVE IT (screen-side password manager).
4. Repeat for project #2: name `jobsafe-prod` (same org, same region).
5. Turn on MFA for your Supabase account (Account > Security) - the service role key is inside.

## 2. Collect keys into `.env`

For each project: Project Settings > API. Copy:

- Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
- anon public key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key -> `SUPABASE_SERVICE_ROLE_KEY` (**server only**, never into the client or
  the extension, never into git)

Dev values go into `.env` at the repo root (copy `.env.example`). Prod values live in the
Vercel project's env settings when Phase 1 deploys to hosting.

## 3. Enable email auth (magic link)

Per project, in Dashboard > Authentication > Providers:

- Enable **Email**: "Confirm email" ON (true for both dev/prod).
- Magic links work with the built-in mailer for dev testing; for prod, configure SMTP
  (Authentication > SMTP) so rate limits are higher - any transactional SMTP (Resend, Postmark,
  Mailgun) works. Do not launch beta on the shared Supabase mailer.

Also set:

- Authentication > URL Configuration: Site URL = `http://localhost:3000` (dev) and the prod
  domain later; add the prod redirect URLs for the popup/extension callback if we use OAuth.

## 4. Data model

The Phase 1 SQL (jobs, applications, scam_checks, reports, warning_lists + RLS policies) lives
in `IMPLEMENTATION_PLAN.md` section 4.1. Run it in the SQL editor of jobsafe-dev when Phase 1
starts. RLS is enabled by that script; after running it, users can only see their own rows.

Do not put anything in the `auth` schema beyond Supabase-managed content.

## 5. Verify (checklist)

- [ ] `jobsafe-dev` and `jobsafe-prod` both exist, region ap-southeast-1.
- [ ] `.env` has working dev URL/anon key (check via a Stripe-free curl or in Phase 1 app).
- [ ] Email provider enabled with confirm-email ON on both projects.
- [ ] MFA enabled on the Supabase account.
- [ ] Service role key lives only in `.env` (dev) and Vercel env vars (prod) - never in git.

## 6. Notes

- Free tier limits are generous enough for dev/beta; verify current limits at
  https://supabase.com/pricing before deciding on paid tiers.
- Consider a third project or a branch database for destructive schema experiments later.
- Backups: Supabase free tier does not include automated backups - Phase 5's restore test will
  need `pg_dump` run from CI or locally, or a paid tier backup plan.
