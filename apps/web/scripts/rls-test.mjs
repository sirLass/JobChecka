#!/usr/bin/env node
/**
 * Phase 1 RLS verification (IMPLEMENTATION_PLAN section 4.2:
 * "RLS tests: confirm user A cannot read user B's rows").
 *
 * Requirements to run:
 *   1. NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY in .env (repo root)
 *      or the shell environment.
 *   2. In the SUPABASE DASHBOARD for that project (dev project!):
 *      Authentication -> Providers -> Email:
 *        - "Confirm email": OFF   (so the script can create accounts directly)
 *        - "Allow new users": ON  (default)
 *   3. node scripts/rls-test.mjs
 *
 * Optional env overrides: RLS_TEST_EMAIL_A/B, RLS_TEST_PASSWORD_A/B,
 * SUPABASE_SERVICE_ROLE_KEY (enables automatic test-user cleanup).
 *
 * Exit code 0 when every cross-user attack is blocked; 1 otherwise.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- tiny .env loader (repo root) so this runs without extra tooling ----------
const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..", "..", "..");
for (const name of [".env", ".env.local"]) {
  const path = join(rootDir, name);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    const hash = value.indexOf(" #");
    if (hash !== -1) value = value.slice(0, hash).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (set .env at repo root).",
  );
  process.exit(1);
}

const run = Date.now();
const emailA = process.env.RLS_TEST_EMAIL_A ?? `rls-a-${run}@example.com`;
const emailB = process.env.RLS_TEST_EMAIL_B ?? `rls-b-${run}@example.com`;
const makePassword = () => `Rls-test-${Math.random().toString(36).slice(2)}!${run}`;
const passwordA = process.env.RLS_TEST_PASSWORD_A ?? makePassword();
const passwordB = process.env.RLS_TEST_PASSWORD_B ?? makePassword();

let failures = 0;
function check(name, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

async function signIn(email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await client.auth.signUp({ email, password });
  if (error) {
    console.error(`Could not sign up ${email}: ${error.message}`);
    if (/confirm/i.test(error.message)) {
      console.error(
        "Hint: set Authentication -> Providers -> Email -> 'Confirm email' = OFF for the dev project.",
      );
    }
    process.exit(1);
  }
  const { data, error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError || !data.user) {
    console.error(`Could not sign in ${email}: ${loginError?.message ?? "unknown"}`);
    process.exit(1);
  }
  return { client, user: data.user };
}

const js = { source_platform: "manual", description: "RLS test post from A" };

const A = await signIn(emailA, passwordA);
const B = await signIn(emailB, passwordB);

// --- positive controls (A can use their own data) -----------------------------
{
  const { data, error } = await A.client
    .from("jobs")
    .insert({ ...js, user_id: A.user.id })
    .select()
    .single();
  const ok = !error && data?.id;
  check("A can insert their own job", ok, error?.code);
  if (!ok) process.exit(1);
  A.jobId = data.id;
  A.appId = (
    await A.client
      .from("applications")
      .insert({ job_id: data.id, user_id: A.user.id })
      .select()
      .single()
  ).data?.id;
  check(
    "A can read back their own job",
    !!(await A.client.from("jobs").select().eq("id", A.jobId)).data?.length,
  );
}

// --- cross-user attacks (all must FAIL to affect A's data) ---------------------
{
  const { data, error } = await B.client.from("jobs").select().eq("id", A.jobId);
  check("B reading A's job returns 0 rows", !error && !data?.length, error?.code);
}
{
  const { data, error } = await B.client.from("jobs").select();
  check(
    "B listing all jobs sees none of A's rows",
    !error && !data?.some((r) => r.id === A.jobId),
    error?.code,
  );
}
{
  const res = await B.client.from("jobs").update({ title: "HACKED" }).eq("id", A.jobId);
  const reverted = await A.client
    .from("jobs")
    .select("title, description")
    .eq("id", A.jobId)
    .single();
  const clean = !res.data && (res.error !== null || res.count === 0) && !reverted.data?.title;
  check("B cannot update A's job", clean, res.error?.code ?? "0 rows");
}
{
  const res = await B.client.from("jobs").delete().eq("id", A.jobId);
  const still = await A.client.from("jobs").select("id").eq("id", A.jobId).maybeSingle();
  check(
    "B cannot delete A's job",
    !res.data && !still.error && !!still.data?.id,
    res.error?.code ?? "0 rows",
  );
}
{
  // with check blocks forging another user_id on insert
  const { error } = await B.client
    .from("jobs")
    .insert({ ...js, user_id: A.user.id })
    .select()
    .single();
  check("B cannot insert a job owned by A", !!error, error?.code);
}
{
  const { data, error } = await B.client.from("scam_checks").select().eq("job_id", A.jobId);
  check("B cannot read A's scam checks", !error && !data?.length, error?.code);
}
{
  const { data, error } = await B.client.from("reports").select().eq("user_id", A.user.id);
  check("B cannot read A's reports", !error && !data?.length, error?.code);
}
if (A.appId) {
  const res = await B.client.from("applications").update({ status: "offer" }).eq("id", A.appId);
  const reverted = await A.client.from("applications").select("status").eq("id", A.appId).single();
  const clean = !res.data && reverted.data?.status === "saved";
  check("B cannot change A's application status", clean, res.error?.code ?? "0 rows");
}

// --- cleanup -------------------------------------------------------------------
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const u of [A.user, B.user]) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) console.error(`cleanup: could not delete ${u.id}: ${error.message}`);
  }
  console.log("cleanup: test users deleted via service role.");
} else {
  console.log(
    "cleanup: set SUPABASE_SERVICE_ROLE_KEY to auto-delete test users (else remove them manually).",
  );
}

console.log(
  failures === 0
    ? "\nRLS OK: all cross-user attacks blocked."
    : `\nRLS FAIL: ${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
