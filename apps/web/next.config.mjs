import { readFileSync } from "node:fs";

/**
 * Single-source configuration (Phase 1).
 *
 * Secrets live in ONE `.env` file at the repo root (modeled by `.env.example`
 * and ignored by git). Next.js normally only reads env files from its own app
 * directory, so we parse the root file here and pass the web app's variables
 * through the `env` config — actual process.env values take precedence.
 */

function readRootEnv() {
  try {
    const raw = readFileSync(new URL("../../.env", import.meta.url), "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // Strip an inline comment marker and surrounding quotes.
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key) out[key] = value;
    }
    return out;
  } catch {
    // No root .env yet — the app surfaces a clear setup message instead.
    return {};
  }
}

const rootEnv = readRootEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? rootEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? rootEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? rootEnv.SUPABASE_SERVICE_ROLE_KEY,
  },
};

export default nextConfig;
