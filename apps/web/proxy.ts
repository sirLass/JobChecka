import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth session refresh + route protection (Next 16 "proxy" convention,
 * formerly middleware.ts). Runs before each request, refreshes the Supabase
 * session cookies, and redirects unauthenticated visitors away from app pages.
 *
 * Every API route and Server Component re-checks auth itself; this only keeps
 * tokens fresh and short-circuits obvious redirects (Next 16 proxies docs:
 * never rely on proxy alone for authorization).
 *
 * If Supabase env vars are missing we pass through — pages then show the
 * "missing .env" message instead of failing silently.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return supabaseResponse;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: no code between client creation and getUser() (token refresh coupling).
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;

  if (!user && (path.startsWith("/dashboard") || path.startsWith("/settings"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Everything except static assets and files with common asset extensions.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml)$).*)",
  ],
};
