import { z } from "zod";
import { MAX_DESCRIPTION_LENGTH } from "@jobsafe/shared";

/**
 * Zod schemas for Phase 1 API routes (IMPLEMENTATION_PLAN section 8:
 * "require auth, validate with Zod, enforce size limits, rate limit per user").
 */

export const JOB_SOURCES = ["jobstreet", "indeed", "manual"] as const;

export const APPLICATION_STATUS_VALUES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

/** http(s):// URL that parses; used for source_url fields. */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const emailSchema = z.email("Enter a valid email address").max(254);

export const authMagicLinkSchema = z.object({
  email: emailSchema,
  /** Relative path to land on after the magic-link callback (must start with "/"). */
  next: z
    .string()
    .max(200)
    .refine((v) => v.startsWith("/") && !v.startsWith("//"), {
      message: "next must be a relative path starting with /",
    })
    .optional(),
});

export const jobCreateSchema = z.object({
  source_platform: z.enum(JOB_SOURCES).default("manual"),
  source_url: z
    .string()
    .max(2000)
    .refine(isHttpUrl, { message: "source_url must be an http(s) URL" })
    .optional(),
  title: z.string().trim().max(200).optional(),
  company_name: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  work_type: z.string().trim().max(100).optional(),
  salary_text: z.string().trim().max(200).optional(),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`,
    ),
  contact_text: z.string().trim().max(4000).optional(),
});

export const jobPatchSchema = z.object({
  title: z.string().trim().max(200).optional(),
  company_name: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  work_type: z.string().trim().max(100).optional(),
  salary_text: z.string().trim().max(200).optional(),
  contact_text: z.string().trim().max(4000).optional(),
  source_url: z
    .string()
    .max(2000)
    .refine(isHttpUrl, { message: "source_url must be an http(s) URL" })
    .optional(),
  /** Application fields (go to the `applications` table, not `jobs`). */
  notes: z.string().trim().max(5000).optional(),
  status: z.enum(APPLICATION_STATUS_VALUES).optional(),
  applied_at: z.string().datetime({ offset: true }).optional(),
});

export const jobsListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  platform: z.enum(JOB_SOURCES).optional(),
  status: z.enum(APPLICATION_STATUS_VALUES).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const reportCreateSchema = z.object({
  kind: z.enum(["scam", "false_alarm"]),
  job_id: z.uuid().optional(),
  reason: z.string().trim().max(2000).optional(),
});
