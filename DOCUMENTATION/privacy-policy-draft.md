# Privacy Policy — JobSafe Tracker (DRAFT for review)

> Status: draft, written 2026-11-02. Have a Philippine lawyer or a data privacy review
> look at this before public beta. Register with the NPC (National Privacy Commission)
> as a personal information controller even if exempt — cheap insurance.
> Plain language on purpose. What users cannot see here, we should not be doing.

## Who we are

JobSafe Tracker is an independent tool for Philippine job seekers ("we", "us"). It is not
affiliated with, endorsed by, or sponsored by JobStreet, SEEK, or Indeed. The extension
reads the job post you ask it to check, stores it in your private dashboard, and flags
warning signs.

## What we collect and why

1. **Account identifier.** Your email address and a generated user ID, via Supabase
   email sign-in. Why: so your saved jobs and app statuses belong only to you.
2. **Job posts you save.** Title, company name, URL, salary text, work type, the post
   text, and contact details found in the post. Why: this is the product — private
   tracking and scam warning checks.
3. **Check results.** Which red-flag rules fired, what they quoted as evidence, AI
   verdict summaries (risk level, confidence, explanation), timestamps. Why: so you see
   the "why" behind every warning, and so the feature keeps working across sessions.
4. **Aggregate metrics we count internally (no content):** number of AI checks per user
   per day, error counts. Why: abuse limits and reliability only.

## What we do NOT collect or do

- We do not collect your resume, full browsing history, keystrokes, screen contents, or
  data from pages you have not asked us to check.
- We do not sell, rent, trade, or share your data with anyone. Not for advertising. Not
  for AI training. Not "for partners."
- We do not read other tabs or interact with websites in your name.
- We do not store API keys in the browser. AI calls run on our server, without your post
  text ever exposing your identity to providers.

## AI processing (your post text is shared with what exactly?)

When a job post is not fully covered by our deterministic rules, we may send its text
(title, description, contact fields — not your name or account data) to Groq, our AI
provider, to generate an in-depth explanation with verifiable sources. Your email or user
ID is never sent. Their processing of text you send to them is THEIR subject: read Groq's
policy yourself before using the deep check. You can add, then remove, any job without an
AI check at any time.

## Retention and deleting

- Your data is retained while your account exists, for the purposes above.
- "Export my data" produces JSON/CSV of every table, in your dashboard, any time.
- "Delete my account" removes ALL your rows (RLS cascade) and cannot be undone. Removing
  the extension from Chrome does not delete server rows — use the delete-account control
  before uninstalling.
- Server logs (operational, non-content) rotate out within 30 days.

## Your rights (Philippine Data Privacy Act; similar to GDPR-lite)

You may: access your data (export), have it corrected (edit any field), have it deleted
(delete), withdraw consent (delete account / stop using AI checks). You may complain to
the NPC if unsatisfied with our answer. Contact for all of this: (add a mailbox,
e.g. privacy@yourdomain, BEFORE any public listing).

## Security

- Transport security (HTTPS) for all client-server traffic.
- Row Level Security (RLS) so each user can read/write only their own data.
- Provider keys live only server-side; the extension bundle contains none.
- We do not ask for your email password, bank/OTP one-time codes, government ID numbers,
  or any credential. We will never ask you to send us the scammer's "request" messages.

## Changes

If we ever change anything above (notably: any new data recipient), we will show a
pop-up notice in the dashboard BEFORE it takes effect. Old versions are archived on
request.
