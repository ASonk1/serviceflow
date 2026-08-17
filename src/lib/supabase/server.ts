import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnvironment } from "@/lib/env/public";
import type { Database } from "@/types/database";
export async function createClient() {
  const cookieStore = await cookies(); const env = getPublicEnvironment();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
    getAll: () => cookieStore.getAll(),
    setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Proxy owns Server Component refresh writes. */ } },
  }});
}
