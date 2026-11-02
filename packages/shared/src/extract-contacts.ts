/**
 * Contact-signal extraction from raw post text (PRD 5.1 / plan 5.2 tasks).
 * Pure functions, no dependencies — used by the rules engine (Phase 2) and the
 * extension capture flow (Phase 3). Handles English and Taglish variants.
 *
 * Output groups are ordered by position of first appearance so UI lists and
 * evidence snippets feel natural. Handles are lowercased for matching.
 */

export interface ChatHandle {
  platform: "telegram" | "whatsapp" | "viber" | "messenger" | "wechat";
  /** Lowercased channel/user identifier (e.g. "t.me/fastencodehr", "0917…"). */
  handle: string;
}

export interface ExtractedContacts {
  emails: string[];
  /** Phone numbers in the loose formats used in PH postings (09…, +63…, (02)…). */
  phones: string[];
  urls: string[];
  chatHandles: ChatHandle[];
}

interface Group {
  emails: string[];
  phones: string[];
  urls: string[];
  chatHandles: ChatHandle[];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// 0917-123-4567 · +63 917 123 4567 · (02) 8888-7777 · 02 888 7777 · (049) 501-1234 — 102
const PHONE_CORE = "(?:\\+?63[\\s-]?)?(?:\\(?0?2\\)?[\\s.-]?)?\\d[\\d\\s.-]{7,}(?:\\d)";
const PHONE_RE = new RegExp(`(?:^|[^\\w+@.])${PHONE_CORE}(?=\\D|$)`, "gm");

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;

// Bare domains written as "website: wfg.finance" or "visit example.com.ph".
const BARE_DOMAIN_RE =
  /(?:^|[\s:>,])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|net|org|ph|io|co|biz|finance|agency|site|online|shop|xyz|info)(?:\.ph)?)(?=[\s,.]|$)/gi;

const CHAT_PATTERNS: { platform: ChatHandle["platform"]; re: RegExp }[] = [
  { platform: "telegram", re: /(?:t\.me\/|telegram[\s:>@]*|tg[\s:>@])([A-Za-z0-9_]{4,})/gi },
  { platform: "whatsapp", re: /(?:wa\.me\/|whatsapp[\s:>+]*)([+\d][\d\s-]{6,})/gi },
  { platform: "viber", re: /viber[\s:>+]*((?:\+\d[\d\s-]{8,})|([\w.A-Za-z-]+@[A-Za-z0-9.-]+)?)/gi },
  { platform: "messenger", re: /messenger\.com\/([\w.]{2,})/gi },
  { platform: "wechat", re: /(?:wechat|weixin)[\s:]*([A-Za-z0-9_-]{4,})/gi },
];

/** Extract every contact signal from an arbitrary blob of post text. */
export function extractContacts(text: string): ExtractedContacts {
  const result: Group = { emails: [], phones: [], urls: [], chatHandles: [] };
  if (!text) return result;

  const seenEmail = new Set<string>();
  for (const match of text.matchAll(EMAIL_RE)) {
    const email = match[0].toLowerCase();
    if (!seenEmail.has(email)) {
      seenEmail.add(email);
      result.emails.push(email);
    }
  }

  // Two pass: explicit URL/emails first so their domain digits never read as phones.
  const withoutEmailsUrls = text
    .replace(EMAIL_RE, " ")
    .replace(URL_RE, " ")
    .replace(BARE_DOMAIN_RE, " $1 ");

  const seenPhone = new Set<string>();
  for (const match of withoutEmailsUrls.matchAll(PHONE_RE)) {
    const digits = match[0].trim().replace(/[^+\d]/g, "");
    if (digits.length >= 9 && digits.length <= 13 && !seenPhone.has(digits)) {
      seenPhone.add(digits);
      result.phones.push(digits);
    }
  }

  const seenUrl = new Set<string>();
  for (const match of text.matchAll(URL_RE)) {
    const url = match[0].replace(/[.,;!?]+$/, "");
    if (!seenUrl.has(url)) {
      seenUrl.add(url);
      result.urls.push(url);
    }
  }

  const seenHandle = new Set<string>();
  for (const { platform, re } of CHAT_PATTERNS) {
    for (const match of withoutEmailsUrls.matchAll(re)) {
      const handle = (match[1] ?? "").trim().toLowerCase();
      if (handle && !seenHandle.has(`${platform}:${handle}`)) {
        seenHandle.add(`${platform}:${handle}`);
        result.chatHandles.push({ platform, handle: match[0].trim().toLowerCase() });
      }
    }
  }

  // "wfg.finance" style company sites appear as bare domains in posting prose.
  for (const match of withoutEmailsUrls.matchAll(BARE_DOMAIN_RE)) {
    const domain = (match[1] ?? "").toLowerCase();
    if (domain && !seenUrl.has(domain)) {
      seenUrl.add(domain);
      result.urls.push(domain);
    }
  }

  return result;
}

/** The part of an email address after the @, lowercased. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase();
}

/** Hostname of a URL string; returns "" when the input is not a parseable URL. */
export function urlHost(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** True for disposable-looking shorteners and link-safety red flags (PRD 5.2). */
const SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "is.gd",
  "t.co",
  "goo.gl",
  "ow.ly",
  "rebrand.ly",
  "bl.ink",
  "s.id",
]);

export function isShortenedUrl(host: string): boolean {
  return SHORTENERS.has(host.toLowerCase().replace(/^www\./, ""));
}
