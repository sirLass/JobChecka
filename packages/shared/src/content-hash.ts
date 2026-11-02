/**
 * Stable content hash used to de-duplicate captures and cache check results
 * (IMPLEMENTATION_PLAN section 4.1 `content_hash`, section 7.6 caching).
 *
 * Normalization: join title + company + description, collapse all whitespace,
 * lowercase. Uses Web Crypto (available in Node >= 18 and all browsers).
 */

const SEPARATOR = "\n---\n";

export interface HashableJob {
  title?: string;
  company?: string;
  description: string;
}

export async function contentHash(job: HashableJob): Promise<string> {
  const text = [job.title ?? "", job.company ?? "", job.description].join(SEPARATOR);
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
