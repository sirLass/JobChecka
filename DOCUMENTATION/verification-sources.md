# Official Verification Sources (Phase 0)

Product: **JobSafe Tracker**. These are the sources the scam-check tools may consult, and
what is known about automation (API vs. manual page) as of 2026-11-02. Verify each URL when
first wired into a tool — government sites reorganize often.

## 1. Company registration — SEC Philippines

- **SEC company verification system (free name/status check):**
  https://checkwithsec.sec.gov.ph/ — check whether a company is registered and its current
  status (registered / dissolved / revoked). This is the primary legitimacy signal for
  corporate posters on JobStreet/Indeed.
- **SEC CRS (Company Registration System / "Smart Search"):** https://crs.sec.gov.ph —
  search by full or partial corporate name.
- **SEC Express (document ordering, paid):** https://secexpress.ph/ — order certified
  copies when we need deep verification (not for automated checks).
- Mobile: official "SEC Check App" on App Store / Google Play (shows the same data; proof
  the name/status check is an intended public service).

**API / automation:** No public documented API for the free checks as of 2026-11-02. The
web front-ends are interactive. Design assumption for Phase 2: verification links are
presented to the user (deep-link them to the search prefilled if possible), and automated
lookups are avoided unless an official API appears.

## 2. Overseas recruitment agencies — DMW (former POEA)

For POGO/agency/abroad-style postings ("work in Japan / Canada / Middle East, agency will
process everything").

- **Licensed Recruitment Agencies directory:** https://dmw.gov.ph/inquiry/licensed-recruitment-agencies
  — official, searchable list of agencies allowed to deploy Filipino workers abroad; shows
  agency name and contact numbers.
- **DMW Advisories (issuances):** https://dmw.gov.ph/resources/issuances/advisories —
  numbered "WARNING AGAINST ILLEGAL RECRUITERS ..." advisories; useful named-threat
  signals, and a source for our eval dataset.
- **Archives:** legacy POEA-era lists remain published, e.g.
  https://dmw.gov.ph/archives/v1/licensed-recruitment-agencies and
  https://dmw.gov.ph/archives/v1/whitelisted/agencies — treat archive pages as historical
  data only (a license may have lapsed since).

**API / automation:** No documented public API. The licensed-agencies page is a searchable
directory; use it as a manual check the tool links to. Job order caveat published by DMW:
sayings like "VERIFY WITH THE AGENCY IF THE JOB ORDER..." — pass this caveat through to
users, never resolve it for them.

## 3. Domestic agencies / DOLE

- **DOLE news & warnings page:** https://dole.gov.ph — publishes warnings (e.g. illegal
  POGO recruitment, fraudulent internet job offers). No maintained "bad employer" list exists
  as a structured dataset as of 2026-11-02; treat DOLE as an advisories/news source, not a
  whitelist for local companies.
- Related government materials worth citing to users: DOLE anti-illegal-recruitment
  guidance ("do not apply at recruitment agencies not licensed by POEA/DMW...").

## 4. Signals we will NOT use from official sources

- No scraping of any government portal.
- No automated bulk verification runs from user checks (each check may present at most a
  few deep links to the user).
- Never cache or republish government data beyond quoting the name/status shown for the
  single company a user asked about, with a timestamp and "verify yourself" link.

## 5. Named lists (internal, non-governmental)

The Phase 1 `warning_lists` table will hold internal lists curated from public scam
reports (NBI/NTF-ELCAC press items, platform safety hubs like
https://www.jobstreet.com.ph/safe-job-searching/), clearly labeled with source and date.
Rules-only checks must work with an empty warning list — lists are signal, not
prerequisites.
