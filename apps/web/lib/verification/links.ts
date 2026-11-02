/**
 * Verification-link generator (plan section 4, Phase 2). Presents a few deep
 * links to OFFICIAL sources so the user can verify the poster themselves — no
 * scraping, no automated lookups (verification-sources.md section 4).
 *
 * All URLs are the ones confirmed in Phase 0 (DOCUMENTATION/verification-sources.md).
 * Government pages reorganize often; re-verify when wiring this into real UI.
 */

import { urlHost } from "@jobsafe/shared";

export interface VerificationLink {
  /** Short button label shown in the check panel. */
  label: string;
  url: string;
  /** One line on what this source can (and cannot) verify. */
  description: string;
}

export interface VerificationInput {
  companyName?: string;
  sourceUrl?: string;
  description?: string;
  sourcePlatform?: string;
}

const SEC_CHECK = "https://checkwithsec.sec.gov.ph/";
const DMW_LICENSED = "https://dmw.gov.ph/inquiry/licensed-recruitment-agencies";
const DMW_ADVISORIES = "https://dmw.gov.ph/resources/issuances/advisories";
const DOLE = "https://dole.gov.ph";
const JOBSTREET_SAFETY = "https://www.jobstreet.com.ph/safe-job-searching/";

/** Abroad/agency-style postings belong to DMW territory (plan section 2). */
const ABROAD_RE =
  /\b(?:overseas|abroad|ofw|japan|korea|taiwan|canada|middle\s+east|saudi|uae|qatar|hong\s+kong|kuwait|dubai|europe|germany|australia|new\s+zealand|israel|agency|manpower|placement|deployment|poea|dmw)\b/i;

const MAX_LINKS = 4;

/**
 * Build up to `MAX_LINKS` verification links, most relevant first:
 * SEC registration for a named company, DMW lists/issuances for abroad-style
 * postings, the platform's own safety guide, and DOLE news as the catch-all.
 */
export function buildVerificationLinks(input: VerificationInput): VerificationLink[] {
  const links: VerificationLink[] = [];
  const companyName = (input.companyName ?? "").trim();
  const description = input.description ?? "";

  if (companyName) {
    links.push({
      label: "SEC check: company name",
      url: SEC_CHECK,
      description:
        "Search the company on the official SEC checker. Find it does not mean the job offer is safe — many scam posts reuse registered names.",
    });
  }

  const abroadish = ABROAD_RE.test(`${companyName} ${description}`);
  if (abroadish) {
    links.push({
      label: "DMW list: licensed agencies",
      url: DMW_LICENSED,
      description:
        "Only agencies on the official DMW licensed list may deploy Filipino workers abroad. Never pay processing fees before you verify the license.",
    });
    links.push({
      label: "DMW advisories: named warnings",
      url: DMW_ADVISORIES,
      description:
        "DMW publishes numbered advisories and illegal-recruiter warnings. Check whether the names in this post appear there.",
    });
  }

  const platform = (input.sourcePlatform ?? "").toLowerCase();
  const host = input.sourceUrl ? urlHost(input.sourceUrl) : "";
  if (platform === "jobstreet" || host.includes("jobstreet")) {
    links.push({
      label: "JobStreet: safe job searching",
      url: JOBSTREET_SAFETY,
      description:
        "The platform's own safety guidance — useful even for manual checks of postings you found elsewhere.",
    });
  }
  if (links.length < 2) {
    // Broad fallback so every check panel offers a non-SEC resource.
    links.push({
      label: "JobStreet: safe job searching",
      url: JOBSTREET_SAFETY,
      description:
        "Independent safety guidance worth reading even when this post came from elsewhere.",
    });
  }
  if (links.length < 2) {
    // Nearly empty panel (no company, plain text): add the government news page.
    links.push({
      label: "DOLE news & warnings",
      url: DOLE,
      description:
        "DOLE publishes recruitment scam warnings; no complete bad-employer list exists.",
    });
  }

  return links.slice(0, MAX_LINKS);
}
