import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy";
const protectedRoots = ["/dashboard", "/client", "/admin", "/onboarding"];
export async function proxy(request: NextRequest) {
  const { response, authenticated } = await refreshSession(request);
  if (!authenticated && protectedRoots.some((root) => request.nextUrl.pathname === root || request.nextUrl.pathname.startsWith(`${root}/`))) {
    const url = new URL("/auth/sign-in", request.url); url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`); return NextResponse.redirect(url);
  }
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0"); return response;
}
export const config = { matcher: ["/auth/:path*", "/dashboard/:path*", "/client/:path*", "/admin/:path*", "/onboarding/:path*"] };
