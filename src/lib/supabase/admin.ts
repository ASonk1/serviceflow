import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnvironment } from "@/lib/env/server";
import type { Database } from "@/types/database";
/** Reserved for trusted jobs and maintenance. Never import from ordinary request code. */
export function createServiceRoleClient() { const env = getServerEnvironment(); return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } }); }
