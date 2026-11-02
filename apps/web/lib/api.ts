import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { createClient } from "./supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Shared helpers for authenticated, Zod-validated API route handlers. */

/** Defence-in-depth body size cap in bytes (also enforced per-field by Zod). */
export const MAX_BODY_BYTES = 200_000;

export class ApiError extends Error {
  status: number;
  details?: { path: string; message: string }[];

  constructor(status: number, message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Require a signed-in user (session cookies). Throws ApiError(401) otherwise.
 * Data access goes through `supabase` (user session) so RLS scopes every query.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError(401, "Sign in to continue");
  }
  return { supabase, user: data.user };
}

/** Parse and validate a JSON request body against a Zod schema. */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    throw new ApiError(413, "Request body too large");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(
      400,
      "Validation failed",
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/** Parse and validate URL search params against a Zod schema. */
export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError(
      400,
      "Invalid query parameters",
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Turn thrown ApiErrors into responses; anything else becomes a generic 500. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status },
    );
  }
  // Never echo body content or internal details into responses/logs (threat model T6).
  console.error("[api] unhandled error:", error instanceof Error ? error.message : error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
