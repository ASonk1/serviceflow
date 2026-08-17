import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnvironment } from "@/lib/env/public";
import type { Database } from "@/types/database";
export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request }); const env = getPublicEnvironment();
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(cookiesToSet, headers) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value)); },
  }});
  const { data } = await supabase.auth.getClaims();
  return { response, authenticated: Boolean(data?.claims?.sub) };
}
