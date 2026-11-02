# Platform Terms of Service Review (Phase 0)

Product: **JobSafe Tracker** — browser extension for JobStreet PH and Indeed PH.

Purpose of this file: record what we read, when, the URL and version date, our conclusion,
and the risks and mitigations we accept. Re-check this page each time a platform changes
its terms (record a new row below).

## Record

| Platform            | URL                            | Last updated (as shown on page) | Reviewed   | Reviewer        |
| ------------------- | ------------------------------ | ------------------------------- | ---------- | --------------- |
| JobStreet PH (SEEK) | https://ph.jobstreet.com/terms | 20 July 2026                    | 2026-11-02 | (add your name) |
| Indeed              | https://www.indeed.com/legal   | 29 September 2026               | 2026-11-02 | (add your name) |

## JobStreet PH (SEEK Limited)

Key clauses relevant to JobSafe Tracker (quotes from the 20 July 2026 version):

- Personal, non-commercial use only: "the materials and Content on our websites and apps
  must only be used for your personal, non-commercial purposes."
- Content copying prohibited: users may not "aggregate, copy or duplicate in any manner any
  of the Content ... including expired job postings" without prior written permission.
- Candidate grant: "a limited, terminable, non-exclusive right to access and use our
  websites and apps only for your personal use seeking employment opportunities for
  yourself. This authorises you to view and download a single copy of the Content ... solely
  for your personal, non-commercial use."
- Automated access prohibited: "You may not use data mining, robots, screen scraping, or
  similar automated data gathering, extraction or publication tools on our websites and
  apps ... except with our prior written consent." Also: "our websites and apps are
  designed for individual human use" — no scripts/bots to "access, query, search, copy,
  collect, mine or harvest information", and circumventing rate-limiting/anti-automation
  measures "may result in suspension or termination."

### Conclusion

- Our design (extension captures the single post the logged-in user is currently viewing,
  on explicit user action, stores it privately in their own account) fits the candidate
  "single copy ... personal use" grant. It remains arguable that even a user-triggered
  extension script counts as "automated data gathering", so we treat this as an accepted
  risk, not a permission.
- **Risk: medium.** Being a distribute-to-many users extension raises the stakes: SEEK
  could view whole-fleet behavior as large-scale copying.
- Mitigations (binding design decisions):
  - Never capture or analyze in the background; only on the user's explicit action.
  - One post per action, never batch/bulk capture, never re-scrape live pages for updates.
  - Saved data stays private to the capturing user's account (RLS), never published,
    aggregated, or shown to other users.
  - No bypassing of rate limits, logins, or anti-bot measures of any kind.
  - If SEEK offers an official API or partner program later, prefer it.

## Indeed (Recruit Holdings)

Key clauses relevant to JobSafe Tracker (quotes from the 29 September 2026 version):

- Personal, non-commercial use only: a Job Seeker "is permitted to use the Site and its
  content for your personal, non-commercial purpose of seeking employment or information
  related to your job search. You agree that your license to use the Site is automatically
  revoked upon your attempt to use the Site for any other purpose." (Section A)
- Scope explicitly covers extensions: Indeed defines "Indeed App" to include any
  "browser extension, browser-based application, ... add-on or plugin" — the extension is
  squarely governed by these Terms.
- Automation prohibited (Section A, "Limits"): "Use of any automation, scripting, or bots
  to automate the Indeed Apply process outside of Indeed's official vendors and tooling is
  prohibited." This reads on the apply flow; our product never applies for the user, which
  keeps us outside this specific clause.
- Site-wide anti-scraping (General Terms for All Users, Section D): "You may not crawl,
  scrape, extract data from, reproduce, duplicate, copy, sell, exploit, trade or resell
  any part of the Site ..." (the sentence continues on the live page; confirm its tail
  when signing off).
- The Terms incorporate program-specific terms and partner/API terms published on
  https://docs.indeed.com; Indeed "may reject, remove, or limit the visibility of any User
  Content ... and may disable any account or restrict your ability to use all or parts of
  the Site, for any or no reason without notice."
- Unilateral controls: Indeed may limit daily applications, require email/phone
  verification, and impose use limits "in its sole discretion" (Section A).

### Conclusion

- Same posture as JobStreet: user-triggered, single-post capture for the user's own
  private tracking fits the personal non-commercial grant; the Section D clause bars
  crawling/scraping/extraction of "any part of the Site", so a whole-page automated copy
  is exactly the forbidden category — only the user-explicit, one-at-a-time design keeps
  us defensibly inside the candidate grant, and even that is an accepted risk, not a
  permission. We never automate Indeed Apply, never bulk-capture, never resell or
  republish content.
- **Risk: medium.** Indeed explicitly names browser extensions in scope and reserves a
  unilateral right to disable accounts/content.
- Mitigations: same list as under JobStreet, plus: do not claim any association with or
  endorsement by Indeed; the extension and store listing must state JobSafe Tracker is
  independent and not affiliated with Indeed or JobStreet/SEEK.

## Standing rules for updates

1. Before each release, re-open both URLs above and diff against the recorded date. Add a
   new row to the table and re-do the conclusions if anything relevant changed.
2. If either platform asks us to stop or remove anything, comply first, record here, ask
   questions second.
3. The Chrome Web Store listing must include this statement: "JobSafe Tracker is an
   independent tool and is not affiliated with, endorsed by, or sponsored by JobStreet,
   SEEK, or Indeed."
