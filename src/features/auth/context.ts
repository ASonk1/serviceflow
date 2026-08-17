import "server-only";
import { createClient } from "@/lib/supabase/server";
import { resolveDestination, type AuthDestination } from "./destination";

export type AuthContext = { userId: string; emailVerified: boolean; platformAdmin: boolean; activeMemberships: { organizationId: string; role: "owner" | "staff" }[]; linkedClient: boolean; destination: AuthDestination };
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;
  const user = userData.user;
  const [{ data: profile }, { data: memberships }, { data: clientRows }] = await Promise.all([
    supabase.from("user_profiles").select("platform_role,status").eq("user_id", user.id).maybeSingle(),
    supabase.from("organization_memberships").select("organization_id,role,status").eq("user_id", user.id).eq("status", "active"),
    supabase.rpc("get_my_client_records"),
  ]);
  const candidates = memberships ?? [];
  const organizationIds = candidates.map((membership) => membership.organization_id);
  const { data: organizations } = organizationIds.length ? await supabase.from("organizations").select("id,status").in("id", organizationIds) : { data: [] };
  const operational = new Set((organizations ?? []).filter((organization) => organization.status !== "suspended" && organization.status !== "draft").map((organization) => organization.id));
  const drafts = new Set((organizations ?? []).filter((organization) => organization.status === "draft").map((organization) => organization.id));
  const activeMemberships = candidates.filter((membership) => operational.has(membership.organization_id) && (membership.role === "owner" || membership.role === "staff")).map((membership) => ({ organizationId: membership.organization_id, role: membership.role as "owner" | "staff" }));
  const facts = { platformAdmin: profile?.platform_role === "platform_admin" && profile.status === "active", activeMembership: activeMemberships.length > 0, resumableDraft: candidates.some((membership) => membership.role === "owner" && drafts.has(membership.organization_id)), linkedClient: Boolean(clientRows?.length), emailVerified: Boolean(user.email_confirmed_at) };
  return { userId: user.id, ...facts, activeMemberships, destination: resolveDestination(facts) };
}
