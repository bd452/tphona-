import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { resolveTenantSlugFromHost } from "@/lib/tenant-hosts";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  let response: NextResponse;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/t/") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    response = NextResponse.next();
  } else {
    const tenantSlug = resolveTenantSlugFromHost(request.headers.get("host"));
    if (!tenantSlug) {
      response = NextResponse.next();
    } else {
      const rewrittenUrl = request.nextUrl.clone();
      rewrittenUrl.pathname = `/t/${tenantSlug}${pathname === "/" ? "" : pathname}`;
      response = NextResponse.rewrite(rewrittenUrl);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
