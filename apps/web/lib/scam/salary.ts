/**
 * Unrealistic-pay sanity check (PRD 5.2). Parses common PH job-ad salary wording
 * (PHP and USD), normalizes everything to a monthly PHP equivalent, and compares
 * against the role-family reference bands in `salary-reference.json`.
 *
 * Deliberately conservative: we only flag when the offer is FAR above the family
 * ceiling (> 2x medium, > 3x high). Below-floor is never flagged (part-time and
 * per-project wording legitimately produces small numbers).
 */

import reference from "./salary-reference.json" with { type: "json" };

export interface SalaryFamily {
  id: string;
  label: string;
  match: string[];
  floor: number;
  median: number;
  ceiling: number;
}

export interface SalaryReference {
  source: string;
  rates: {
    usd_php: number;
    working_hours_per_month: number;
    working_days_per_month: number;
    weeks_per_month: number;
  };
  families: SalaryFamily[];
}

const REF = reference as unknown as SalaryReference;

export const SALARY_SOURCE_NOTE = REF.source;

const RATES = REF.rates;

export type SalaryPeriod = "hour" | "day" | "week" | "month" | "year";

export interface ParsedSalary {
  /** Verbatim text span matched in the post (for evidence snippets). */
  matchedText: string;
  currency: "PHP" | "USD";
  period: SalaryPeriod;
  amount: number;
  /** Normalized monthly value in PHP for comparison against family ceilings. */
  monthlyPhp: number;
}

const PERIOD_MONTHLY_FACTOR: Record<SalaryPeriod, number> = {
  hour: RATES.working_hours_per_month,
  day: RATES.working_days_per_month,
  week: RATES.weeks_per_month,
  month: 1,
  year: 1 / 12,
};

/**
 * Money-token prefix: PHP written as ₱, P, PHP (or USD as $, US$, USD).
 * The bare P and $ variants require a digit or space+digit right after them
 * (\bp\b cannot match "P4,000" because P and the digit are both word chars).
 */
const CURRENCY_NUMBER_RE =
  /(₱|\bphp\b|\bphilippine\s+pesos?\b|\bp(?=\s?\d)|\busd\b|\bus\$\b|\$(?=\s?\d))\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{3,}(?:\.\d+)?)(\s?k\b)?/gi;

/**
 * Period words that may directly follow a money token. Only "glue" connectors
 * (per / a / every / each / for, an optional range tail, slashes/dashes) are
 * allowed between the number and the period so that phrases like "P16,000 base
 * plus daily allowance" or "P9,800 converts into daily profit" never read as
 * salary-per-period. An optional plain number is allowed to cover ranges
 * ("P25,000 - 45,000 monthly" anchors the period on the top of the range).
 */
/** Period words that may directly follow a money token (see module comment). */
const PERIOD_RE =
  /^[\s,:]*(?:[-–—/]\s*)?(\d[\d,]*)?\s*(?:(?:per|a|every|each|for)\s+)?(?:task\s*|calendar\s*)?(hourly|hours?\b|hrs?\b|daily|days?\b|weekly|weeks?\b|monthly|months?\b|yearly|years?\b|annum)/i;

/**
 * Bare number + period, for amounts written without a PHP marker (15000/day).
 * Dash ranges are deliberately NOT supported here — dash-chained phone numbers
 * ("0917-555-0199 daily") would read as wages; ranges only parse on
 * currency-marked amounts.
 */
const NUMBER_PERIOD_RE =
  /\b(\d{1,3}(?:,\d{3})+|\d{4,6})\s*\/?\s*(?:(?:per|a|every|each|for)\s+)?(?:task\s*)?(hourly|hours?\b|hrs?\b|daily|days?\b|weekly|weeks?\b|monthly|months?\b|yearly|years?\b|annum)/gi;

function periodOf(word: string): SalaryPeriod {
  const w = word.toLowerCase();
  if (w.startsWith("hour") || w.startsWith("hr")) return "hour";
  if (w.startsWith("day")) return "day";
  if (w.startsWith("week") || w.startsWith("wk")) return "week";
  if (w.startsWith("month") || w === "mo") return "month";
  return "year";
}

function monthlyOf(currency: "PHP" | "USD", amount: number, period: SalaryPeriod): number {
  const converted = currency === "USD" ? amount * RATES.usd_php : amount;
  return Math.round(converted * PERIOD_MONTHLY_FACTOR[period]);
}

/** Whether a small "k"-multiplier amount is a plausible salary size (not "P50"). */
function plausibleAmount(amount: number): boolean {
  return amount >= 100 && amount <= 10_000_000;
}

/**
 * Parse every salary-looking money span in a text. Currency-prefixed amounts
 * are ignored when no period word immediately follows (those are usually
 * one-time fees or deposits, which the fee_request rule handles instead).
 */
export function parseSalaries(text: string): ParsedSalary[] {
  if (!text) return [];
  const out: ParsedSalary[] = [];

  for (const match of text.matchAll(CURRENCY_NUMBER_RE)) {
    const [, currencyWord, numeric, kSuffix] = match;
    if (!numeric || !currencyWord) continue;
    let amount = Number(numeric.replace(/,/g, ""));
    if (kSuffix) amount *= 1_000;
    if (!Number.isFinite(amount) || !plausibleAmount(amount)) continue;

    // Period must appear right after the number (see PERIOD_RE for glue rules).
    const matchEnd = (match.index ?? 0) + match[0].length;
    const after = text.slice(matchEnd, matchEnd + 24);
    const periodMatch = PERIOD_RE.exec(after);
    if (!periodMatch) continue; // zero-period money = probably a fee, not a wage

    const periodWord = periodMatch[2] ?? "";
    const period = periodOf(periodWord);
    // "P25,000 - 45,000 monthly": the period anchors on the (higher) range top.
    const rangeTop = periodMatch[1];
    if (rangeTop) {
      const topAmount = Number(rangeTop.replace(/,/g, ""));
      if (Number.isFinite(topAmount) && topAmount >= amount) amount = topAmount;
    }
    const upper = currencyWord.toUpperCase();
    const currency: "PHP" | "USD" = /\$|USD/.test(upper) ? "USD" : "PHP";
    const span = text.slice(match.index ?? 0, matchEnd + (periodMatch[0] ?? "").length);
    out.push({
      matchedText: span.trim(),
      currency,
      period,
      amount,
      monthlyPhp: monthlyOf(currency, amount, period),
    });
  }

  for (const match of text.matchAll(NUMBER_PERIOD_RE)) {
    const [, numeric, periodWord] = match;
    if (!numeric || !periodWord) continue;
    // Skip spans already processed via a currency marker (regex overlap), and
    // skip amounts that follow a dash — dash-chained phone numbers are not wages.
    const before = text.slice(Math.max(0, (match.index ?? 0) - 4), match.index ?? 0);
    if (/(₱|php|usd|\$)\s?$/i.test(before) || /\bp\s?$/i.test(before)) continue;
    if (/[-–—]\s?$/.test(text.slice(Math.max(0, (match.index ?? 0) - 2), match.index ?? 0)))
      continue;
    const amount = Number(numeric.replace(/,/g, ""));
    if (!Number.isFinite(amount) || !plausibleAmount(amount)) continue;
    const period = periodOf(periodWord);
    out.push({
      matchedText: match[0].trim(),
      currency: "PHP",
      period,
      amount,
      monthlyPhp: monthlyOf("PHP", amount, period),
    });
  }

  return out;
}

interface CompiledFamily {
  family: SalaryFamily;
  keywords: RegExp[];
}

let COMPILED: CompiledFamily[] | null = null;

function compiledFamilies(): CompiledFamily[] {
  if (!COMPILED) {
    COMPILED = REF.families.map((family) => ({
      family,
      keywords: family.match.map(
        (kw) => new RegExp(`(?<![\\w])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i"),
      ),
    }));
  }
  return COMPILED;
}

/** Pick the salary family for a post from its title + description keywords. */
export function matchSalaryFamily(text: string): SalaryFamily {
  const lower = text.toLowerCase();
  for (const { family, keywords } of compiledFamilies()) {
    if (keywords.some((kw) => kw.test(lower))) return family;
  }
  const general = compiledFamilies().find((c) => c.family.id === "general");
  return (
    general?.family ?? {
      id: "general",
      label: "General / unlisted roles",
      match: [],
      floor: 14_000,
      median: 20_000,
      ceiling: 45_000,
    }
  );
}

export function matchSalaryFamilyForPost(
  title: string | undefined,
  description: string,
): { family: SalaryFamily; haystack: string } {
  const titleText = (title ?? "").trim();
  // The title carries the role; check it alone first so a stray keyword in the
  // body text does not overshadow an obvious role match.
  if (titleText) {
    const family = matchSalaryFamily(titleText);
    if (family.id !== "general") return { family, haystack: titleText };
  }
  return {
    family: matchSalaryFamily(titleText ? `${titleText}\n${description}` : description),
    haystack: description.slice(0, 400),
  };
}

/**
 * Flag level for an implied monthly salary vs the role family's typical range.
 * `null` means within range (or below floor — never flagged).
 */
export function salaryRiskLevel(
  family: SalaryFamily,
  impliedMonthlyPhp: number,
): "medium" | "high" | null {
  if (impliedMonthlyPhp <= family.ceiling) return null;
  const ratio = impliedMonthlyPhp / family.ceiling;
  if (ratio > 3) return "high";
  if (ratio > 2) return "medium";
  return null;
}
