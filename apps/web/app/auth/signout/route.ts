import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/signout — clears the session cookies, returns to login. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error("[auth] signOut failed:", error instanceof Error ? error.message : error);
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
