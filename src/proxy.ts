import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveTenantSlugFromHost } from "@/lib/tenant-hosts";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/t/") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const tenantSlug = resolveTenantSlugFromHost(request.headers.get("host"));
  if (!tenantSlug) {
    return NextResponse.next();
  }

  const rewrittenUrl = request.nextUrl.clone();
  rewrittenUrl.pathname = `/t/${tenantSlug}${pathname === "/" ? "" : pathname}`;

  return NextResponse.rewrite(rewrittenUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
