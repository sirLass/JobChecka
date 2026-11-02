import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for the few operations that cannot run under RLS
 * (Phase 1: user self-deletion in POST /api/account).
 *
 * SERVER ONLY — must never be imported from client components. If the key is
 * missing, callers receive `null` and should respond 503 "not configured".
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createSupabaseClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
