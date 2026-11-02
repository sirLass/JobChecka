/**
 * Deterministic scam rules (PRD 5.2 stage 1, plan section 4 Phase 2 skeleton).
 *
 * Every rule is a pure function over the saved post text and returns at most one
 * hit per rule id, with a verbatim evidence snippet quoted from the post. No
 * network calls, no AI: this is the instant (<1s) result shown while the richer
 * check runs in the background (Phase 4).
 *
 * Severity semantics used by the combiner (score.ts):
 *   high   -> strong red flags (fees, sensitive data, mismatches, hidden links…)
 *   medium -> meaningful but explainable signals (free email, chat contact…)
 * Wording rules (PRD 6.3): explanations describe warning signs, never call a
 * company a scammer, and never certify anything as safe or legitimate.
 */

import {
  extractContacts,
  emailDomain,
  isShortenedUrl,
  urlHost,
  type ExtractedContacts,
  type Post,
} from "@jobsafe/shared";
import { matchSalaryFamilyForPost, parseSalaries, salaryRiskLevel } from "./salary.ts";

export type Severity = "low" | "medium" | "high";

export interface RuleHit {
  id: string;
  severity: Severity;
  /** Verbatim (trimmed) quote from the post text that triggered the rule. */
  evidence: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Text scanning helpers
// ---------------------------------------------------------------------------

interface Sentence {
  text: string;
  /** Absolute index of the sentence start inside the full text. */
  start: number;
}

/** Split into sentence-ish chunks while keeping absolute offsets for evidence. */
function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    if (start === -1) {
      if (!/\s/.test(ch)) start = i;
      continue;
    }
    if (ch === "." || ch === "!" || ch === "?" || ch === "\n") {
      const raw = text.slice(start, i);
      const trimmed = raw.trim();
      if (trimmed) out.push({ text: trimmed, start: start + raw.indexOf(trimmed.charAt(0)) });
      start = -1;
    }
  }
  if (start !== -1) {
    const raw = text.slice(start);
    const trimmed = raw.trim();
    if (trimmed) out.push({ text: trimmed, start: start + raw.indexOf(trimmed.charAt(0)) });
  }
  return out;
}

/** Verbatim snippet around an absolute text index (plan section 4 `snippet`). */
function snippet(text: string, index: number, radius = 60): string {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)).trim();
}

// ---------------------------------------------------------------------------
// Shared phrase dictionaries (English + Taglish; PRD 5.2 wording)
// ---------------------------------------------------------------------------

/**
 * Sentences that require money to apply or start: fee compounds, deposits,
 * "pay … for [pre-hire item]", Taglish payment verbs, payment-conditional
 * start dates. Single "fee"/"bayad" words are deliberately not triggers by
 * themselves — the compounds keep false positives low.
 */
const FEE_TRIGGERS: RegExp[] = [
  /\b(?:registr(?:ation)?|train(?:ing|ees?)?|process(?:ing)?|join(?:ing|up)?|enroll(?:ment)?|member(?:ship)?|placement|sign[- ]?up|application|screening)\s+fees?\b/i,
  /\bone[- ]time\s+(?:enrollment|registration|joining|payment|fee)\b/i,
  /\b(?:registr(?:ation)?|enroll(?:ment)?|join(?:ing)?|member(?:ship)?)\b[^.!?]{0,20}\b(?:of|worth|is)\b\s*(?:php|p|₱)?\s*[\d,]{3,}/i,
  /\b(?:refundable\s+|refund\s+)?deposit\b/i,
  /\bpay(?:ment)?\b[^.!?]{0,90}\b(?:uniform|id\b|medical|nbi|clearance|barangay|red[- ]cross|kit)\b/i,
  /\b(?:magbayad|magbabayad|babayaran|pambayad|bayad(?:an)?)\b/i,
  /(?:after|before|upon)\s+(?:full\s+|complete\s+)?payment\b/i,
  /\bpayable\s+in\s+full\b/i,
  /\bpayment\b[^.!?]{0,30}\b(?:received|cleared|settled|confirmed|complete)\b/i,
];

/** A fee trigger is voided in the same sentence when payment is negated. */
const FEE_NEGATIONS: RegExp[] = [
  /\b(?:no|walang|wala|never|hi[nw]di|wag|huwag)\b(?:\s+\w+){0,1}\s*(?:fees?|bayad(?:an)?|magbayad|magbabayad|babayaran|charges?|payments?|upfront|cash)\b/i,
  /\b(?:fees?|bayad|charges?|payments?)\b[^.!?]{0,40}\b(?:walang|never|not|hindi|wag|huwag|free)\b/i,
  /\bfree\s+of\s+charge\b/i,
];

const CHAT_PLATFORMS: { id: string; re: RegExp }[] = [
  { id: "telegram", re: /\bt\.me\/|\btelegram/i },
  { id: "whatsapp", re: /\bwa\.me\/|whatsapp/i },
  { id: "viber", re: /\bviber/i },
  { id: "messenger", re: /(?<!office )(?<!courier )messenger/i },
  { id: "wechat", re: /\bwechat\b|\bweixin\b/i },
  { id: "discord", re: /\bdiscord/i },
];

/** The interview/processing itself happens inside the chat app (strong signal). */
const INTERVIEW_ON_CHAT_RE =
  /(?:messenger|viber|telegram|whatsapp|wechat|discord|google\s?chat)[^.!?\n]{0,55}(?:interview|screening|orientation)|(?:interview|screening|orientation)[^.!?\n]{0,55}(?:messenger|viber|telegram|whatsapp|wechat|discord|google\s?chat)/i;

/** The matched span names an in-person step too (walk-in at the branch). */
const IN_PERSON_RE =
  /\b(?:walk[- ]?in|in[- ]?person|on[- ]?site|at (?:the|our)? ?(?:branch|office|store|site)|sa (?:branch|office|store|site))\b/i;

const PERSONAL_ACCOUNT_RE =
  /\bpersonal\s+(?:account|acct|messenger|viber|telegram|chat|number|pm|message)\b/i;

/** Hosts that are application channels or link sinks, never "the company website". */
const NON_WEBSITE_HOSTS = new Set([
  "linkedin.com",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "reddit.com",
  "calendly.com",
  "zoom.us",
  "zoom.com",
  "docs.google.com",
  "forms.gle",
  "drive.google.com",
  "mail.google.com",
  "t.me",
  "m.me",
  "telegram.me",
  "wa.me",
  "chat.whatsapp.com",
  "viber.com",
  "messenger.com",
  "jobstreet.com",
  "jobstreet.com.ph",
  "indeed.com",
  "kalibrr.com",
  "onlinejobs.ph",
  "workabroad.ph",
  "bestjobs.ph",
  "glassdoor.com",
  "upwork.com",
  "freelancer.com",
  "fiverr.com",
]);

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "icloud.com",
  "me.com",
  "mac.com",
  "gmx.com",
  "mail.ru",
  "tutanota.com",
  "zohomail.com",
]);

/** Physical-presence phrases; excludes the bare word "address" (put on forms). */
const ADDRESS_RE =
  /\b(?:bldg|building|floor|flr|unit|suite|room|branch|offices?|store|mall|plaza|purok|barangay|block|lot|street|road|avenue|boulevard|highway|hwy|blvd|walk[- ]?in|on[- ]?site|depot|compound)\b/i;

const URGENCY_TRIGGERS: RegExp[] = [
  /\bhiring\s+(?:immediately|urgently|now|today)\b/i,
  /\b(?:limited|few|only)\s+slots?\b[^.!?]{0,20}\b(?:left|remaining|available)\b/i,
  /\bslots?\b[^.!?]{0,12}\b(?:are|is)\b[^.!?]{0,10}\blimited\b/i,
  /\bslots?\b[^.!?]{0,25}\bleft\b/i,
  /\b(?:only\s+a\s+few|slots?\s+taken\s+already|taken\s+already)\b/i,
  /\bfilled?\s+na\b|\bfilled\s+(?:up|na)\s+ang\b/i,
  /\bmamaya\b/,
  /\bngayon\s+na\b/i,
  /\b(?:apply|reply|message|register|respond|submit|send|contact|chat)\b[^.!?]{0,30}\b(?:now|today|right away|asap|ngayon)\b/i,
  /\bno\s+interview\b/i,
  /\b(?:start|report(?:ing)?|pasok|training|processing)\b[^.!?]{0,35}\b(?:tomorrow|today|immediately|right away|agad|ngayon)\b/i,
  /\bwithin\s+24\s*hours?\b/i,
  /\bdeadline\b[^.!?]{0,20}\b(?:today|tomorrow|now)\b/i,
  /\binstant\s+(?:start|hiring|payout|task)\b/i,
];

const SENSITIVE_TRIGGERS: RegExp[] = [
  /\bselfie/i,
  /\b\d[\s-]?valid\s+ids?\b/i,
  /\b(?:photos?|front|back|sides?|copy|copies|photocopy|screenshot)[^.!?]{0,25}\bof\s+(?:your|ur|the)?\s*id\b/i,
  /\bid\b[^.!?]{0,25}\b(?:front|back|sides?|photocopy|copy|screenshot)/i,
  /\b(?:bank|banking|gcash|maya|paymaya|coinbase|bpi|bdo|unionbank|bancnet|wallet)\b[^.!?]{0,60}\b(?:accounts?\b|balance|pins?|details|number)\b/i,
  /(?:banking|gcash|verification|security|otp|bank)[^.!?]{0,20}\bpins?\b/i,
  /\b(?:6|six)[- ]digit\b|\bverification\s+code\b|\botp\b/i,
];

/** Words that prove the post specifies duties (vague_duties must NOT fire). */
const JOB_SPEC_RE =
  /\b(?:duties|responsibilit|requirements?|qualifications?|benefits|job description|must\s+have|experience\s+in|skill)\b/i;

/** Recruiter-bait phrasing PRD calls out for short, duty-free posts. */
const VAGUE_BAIT_RE =
  /\b(?:simple|easy(?:\s+money)?|no\s+experience|no\s+skills?|no\s+boss|no\s+interview|typing|online\s+tasks|task\s+list|encoding|data\s*entry|copy\s?-?paste|instant\s+(?:start|hiring|payout|task)|send(?:\s+your|\s+us)?\s+(?:your\s+)?(?:full\s+)?name|easy\s+work|start\s+(?:tomorrow|today|now))\b/i;

function isCompanyWebsite(host: string): boolean {
  return host.length > 0 && !isShortenedUrl(host) && !NON_WEBSITE_HOSTS.has(host);
}

function companyWebsiteHosts(contacts: ExtractedContacts): string[] {
  const hosts: string[] = [];
  for (const u of contacts.urls) {
    const host = urlHost(u);
    if (host && isCompanyWebsite(host) && !hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

function ruleFeeRequest(rows: Sentence[], fullText: string): RuleHit | null {
  for (const row of rows) {
    if (FEE_TRIGGERS.some((t) => t.test(row.text))) {
      if (FEE_NEGATIONS.some((n) => n.test(row.text))) continue;
      let index = row.start;
      for (const t of FEE_TRIGGERS) {
        const m = t.exec(row.text);
        if (m) {
          index = row.start + m.index;
          break;
        }
      }
      return {
        id: "fee_request",
        severity: "high",
        evidence: snippet(fullText, index, 70),
        explanation:
          "The post requires payment to apply or start (registration, training, deposit, uniform or similar). Legitimate employers do not charge applicants.",
      };
    }
  }
  return null;
}

function ruleOffPlatformChat(fullText: string): RuleHit | null {
  let kwIndex = -1;
  for (const { re } of CHAT_PLATFORMS) {
    const m = re.exec(fullText);
    if (m) {
      kwIndex = m.index;
      break;
    }
  }
  if (kwIndex === -1) return null;

  // High when the hiring process itself runs inside the chat app, the account
  // is personal, or the chat app is the ONLY verifiable contact channel.
  // PRD wording: "Messenger-only contact".
  let strong = PERSONAL_ACCOUNT_RE.test(fullText);
  const interviewSpan = INTERVIEW_ON_CHAT_RE.exec(fullText);
  if (interviewSpan && !IN_PERSON_RE.test(interviewSpan[0])) strong = true;
  if (!strong) {
    const contacts = extractContacts(fullText);
    const hasEmail = contacts.emails.length > 0;
    const hasWebsite = contacts.urls.some((u) => isCompanyWebsite(urlHost(u)));
    strong = !hasEmail && !hasWebsite && !ADDRESS_RE.test(fullText);
  }

  return {
    id: "off_platform_chat",
    severity: strong ? "high" : "medium",
    evidence: snippet(fullText, kwIndex, 56),
    explanation:
      "Contact and the hiring process run through a chat app instead of official recruitment channels. Confirm who owns the account before sharing anything.",
  };
}

function ruleFreeEmail(fullText: string, contacts: ExtractedContacts): RuleHit | null {
  const emails = contacts.emails;
  if (emails.length === 0) return null;
  if (!emails.every((e) => FREE_EMAIL_DOMAINS.has(emailDomain(e)))) return null;
  let index = -1;
  for (const e of emails) {
    const i = fullText.indexOf(e);
    if (i !== -1 && (index === -1 || i < index)) index = i;
  }
  return {
    id: "free_email",
    severity: "medium",
    evidence: index === -1 ? (emails[0] ?? "") : snippet(fullText, index, 50),
    explanation:
      "The only email contact is a free personal account (Gmail, Yahoo, Outlook and similar). Real employers normally use their own domain.",
  };
}

function ruleWebsiteMismatch(fullText: string, contacts: ExtractedContacts): RuleHit | null {
  const websiteHosts = companyWebsiteHosts(contacts);
  const emails = contacts.emails;
  if (websiteHosts.length === 0 || emails.length === 0) return null;

  const domains = emails.map(emailDomain);
  const related = domains.some((d) =>
    websiteHosts.some((h) => d === h || d.endsWith(`.${h}`) || h.endsWith(`.${d}`)),
  );
  if (related) return null;

  // Evidence: quote the stated website and the contact email with some context.
  const firstSite = websiteHosts[0] ?? "";
  const firstEmail = emails[0] ?? "";
  const index = fullText.indexOf(firstSite);
  const evidence =
    index === -1
      ? snippet(fullText, fullText.indexOf(firstEmail), 60)
      : snippet(fullText, index, 60);
  return {
    id: "email_website_mismatch",
    severity: "high",
    evidence,
    explanation:
      "The email contact and the company website named in the post use different domains. Look the real domain up yourself before trusting the contact.",
  };
}

function ruleUnrealisticPay(
  title: string,
  salaryText: string,
  description: string,
  fullText: string,
): RuleHit | null {
  const scanText = [title, salaryText, description].filter(Boolean).join("\n\n");
  const salaries = parseSalaries(scanText);
  const first = salaries[0];
  if (!first) return null;

  const { family } = matchSalaryFamilyForPost(title, description);
  const top = salaries.reduce((best, s) => (s.monthlyPhp > best.monthlyPhp ? s : best), first);
  const level = salaryRiskLevel(family, top.monthlyPhp);
  if (!level) return null;

  // `matchedText` is verbatim from scanText; a span that crossed a join (e.g. a
  // period word spilling into the next block) stays verbatim because both the
  // scan blocks and fullText quote the post. Fall back to the span's first
  // segment so the snippet is always an exact post substring.
  const locateIn = fullText.includes(top.matchedText)
    ? fullText
    : (top.matchedText.split(/\n\n/)[0] ?? top.matchedText);
  const index = locateIn.indexOf(top.matchedText);

  return {
    id: "unrealistic_pay",
    severity: level,
    evidence: index === -1 ? top.matchedText.trim() : snippet(locateIn, index, 55),
    explanation: `About PHP ${top.monthlyPhp.toLocaleString("en-PH")} per month implied here is far above the typical range for roles like this (reference family "${family.label}", typical ceiling about PHP ${family.ceiling.toLocaleString("en-PH")}). Ask why the pay is so high.`,
  };
}

function ruleVagueDuties(description: string, fullText: string): RuleHit | null {
  if (description.trim().length >= 240) return null;
  if (JOB_SPEC_RE.test(fullText)) return null;
  const bait = VAGUE_BAIT_RE.exec(fullText);
  if (!bait) return null;

  return {
    id: "vague_duties",
    severity: "medium",
    evidence: snippet(fullText, bait.index, 55),
    explanation:
      "The post is very short, stresses ease and money instead of the work, and lists no duties or requirements. Ask for the job description first.",
  };
}

function ruleMissingIdentity(
  company: string,
  fullText: string,
  contacts: ExtractedContacts,
): RuleHit | null {
  if (company.trim().length >= 3) return null;
  if (contacts.urls.some((u) => isCompanyWebsite(urlHost(u)))) return null;
  if (ADDRESS_RE.test(fullText)) return null;

  return {
    id: "missing_identity",
    severity: "high",
    evidence: snippet(fullText, 0, 70),
    explanation:
      "The post names no company, office address or website, so there is nothing to verify the employer against.",
  };
}

function ruleUrgencyPressure(rows: Sentence[], fullText: string): RuleHit | null {
  for (const row of rows) {
    for (const t of URGENCY_TRIGGERS) {
      const m = t.exec(row.text);
      if (m) {
        return {
          id: "urgency_pressure",
          severity: "medium",
          evidence: snippet(fullText, row.start + m.index, 55),
          explanation:
            "The post pushes you to act fast (limited slots, apply today, hiring with no selection). Pressure tactics are common in recruitment scams.",
        };
      }
    }
  }
  return null;
}

function ruleSensitiveData(rows: Sentence[], fullText: string): RuleHit | null {
  for (const row of rows) {
    for (const t of SENSITIVE_TRIGGERS) {
      const m = t.exec(row.text);
      if (m) {
        return {
          id: "sensitive_data",
          severity: "high",
          evidence: snippet(fullText, row.start + m.index, 55),
          explanation:
            "The application asks for things that enable identity theft: photos of IDs, selfies holding ID, bank details, PINs or one-time codes. Never provide these at the application stage.",
        };
      }
    }
  }
  return null;
}

function ruleSuspiciousLink(fullText: string, contacts: ExtractedContacts): RuleHit | null {
  for (const u of contacts.urls) {
    const host = urlHost(u);
    const rawIndex = fullText.indexOf(u) !== -1 ? fullText.indexOf(u) : fullText.indexOf(host);
    if (isShortenedUrl(host)) {
      return {
        id: "suspicious_link",
        severity: "high",
        evidence: rawIndex === -1 ? u : snippet(fullText, rawIndex, 50),
        explanation:
          "The post uses a shortened link that hides its real destination. Never enter login or personal details through such links.",
      };
    }
    const insecure = /^http:\/\//i.test(u) && !/^https:\/\//i.test(u);
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (insecure || isIp) {
      return {
        id: "suspicious_link",
        severity: "high",
        evidence: rawIndex === -1 ? u : snippet(fullText, rawIndex, 50),
        explanation: isIp
          ? "The post links to a bare IP address instead of a named website — a common phishing pattern."
          : "The post links over unencrypted HTTP rather than HTTPS.",
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function runRules(post: Post): RuleHit[] {
  const title = (post.title ?? "").trim();
  const salaryText = (post.salaryText ?? "").trim();
  const description = post.description ?? "";
  const contact = post.contact ?? "";
  // The plan skeleton scans description + contact; title and salary_text also
  // carry signal (role names, "Hiring Immediately", wages), so they join in.
  const fullText = [title, description, contact, salaryText].filter(Boolean).join("\n");
  if (!fullText) return [];

  const rows = splitSentences(fullText);
  const contacts = extractContacts(fullText);

  // Rules run in PRD 5.2 table order so UI lists and tests stay stable.
  return [
    ruleFeeRequest(rows, fullText),
    ruleOffPlatformChat(fullText),
    ruleFreeEmail(fullText, contacts),
    ruleWebsiteMismatch(fullText, contacts),
    ruleUnrealisticPay(title, salaryText, description, fullText),
    ruleVagueDuties(description, fullText),
    ruleMissingIdentity(post.company ?? "", fullText, contacts),
    ruleUrgencyPressure(rows, fullText),
    ruleSensitiveData(rows, fullText),
    ruleSuspiciousLink(fullText, contacts),
  ].filter((hit): hit is RuleHit => hit !== null);
}
