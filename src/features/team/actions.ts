"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getPublicEnvironment } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";
import type { TeamActionResult } from "./action-result";
import { acceptInvitationSchema, invitationMutationSchema, inviteTeamMemberSchema, memberProfileSchema, memberStatusSchema } from "./schemas";

function raw(data: FormData) { return Object.fromEntries([...data.entries()].filter(([key]) => !key.startsWith("$ACTION_"))); }
function invalid(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }): TeamActionResult {
  return { status: "error", code: "VALIDATION_FAILED", message: "Check the highlighted fields.", fields: error.flatten().fieldErrors };
}
async function verifiedClient() {
  const db = await createClient(); const { data } = await db.auth.getUser();
  return data.user?.email_confirmed_at ? db : null;
}
function refreshTeam(membershipId?: string) {
  revalidatePath("/dashboard"); revalidatePath("/dashboard/team"); revalidatePath("/dashboard/services");
  if (membershipId) revalidatePath(`/dashboard/team/${membershipId}`);
  revalidatePath("/book/[slug]", "page");
}
async function deliverInvite(email: string, invitationId: string) {
  const admin = createServiceRoleClient(); const env = getPublicEnvironment();
  await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/team/accept?invitation=${invitationId}`,
    data: { serviceflow_invitation_id: invitationId },
  });
}
export async function inviteTeamMember(_: TeamActionResult, data: FormData): Promise<TeamActionResult> {
  const parsed = inviteTeamMemberSchema.safeParse(raw(data)); if (!parsed.success) return invalid(parsed.error);
  const db = await verifiedClient(); if (!db) return { status: "error", code: "UNAUTHENTICATED", message: "Your verified session has expired." };
  const { data: invitationId, error } = await db.rpc("create_team_invitation", { target_org_id: parsed.data.organizationId, invite_email: parsed.data.email });
  if (error || !invitationId) return { status: "error", code: error?.code === "23505" ? "CONFLICT" : "UNAVAILABLE", message: error?.code === "23505" ? "This person is already a member or has a current invitation." : "The invitation could not be created." };
  await deliverInvite(parsed.data.email, invitationId).catch(() => undefined);
  refreshTeam(); redirect("/dashboard/team?invited=1");
}
export async function resendInvitation(_: TeamActionResult, data: FormData): Promise<TeamActionResult> {
  const parsed = invitationMutationSchema.safeParse(raw(data)); if (!parsed.success) return invalid(parsed.error);
  const db = await verifiedClient(); if (!db) return { status: "error", code: "UNAUTHENTICATED", message: "Your verified session has expired." };
  const { data: email, error } = await db.rpc("resend_team_invitation", { target_invitation_id: parsed.data.invitationId });
  if (error || !email) return { status: "error", code: "UNAVAILABLE", message: "Only a current pending invitation can be resent." };
  await deliverInvite(email, parsed.data.invitationId).catch(() => undefined); refreshTeam();
  return { status: "success", message: "Invitation sent again." };
}
export async function revokeInvitation(_: TeamActionResult, data: FormData): Promise<TeamActionResult> {
  const parsed = invitationMutationSchema.safeParse(raw(data)); if (!parsed.success) return invalid(parsed.error);
  const db = await verifiedClient(); if (!db) return { status: "error", code: "UNAUTHENTICATED", message: "Your verified session has expired." };
  const { error } = await db.rpc("revoke_team_invitation", { target_invitation_id: parsed.data.invitationId });
  if (error) return { status: "error", code: "UNAVAILABLE", message: "The invitation could not be revoked." };
  refreshTeam(); return { status: "success", message: "Invitation revoked." };
}
export async function updateMemberProfile(_: TeamActionResult, data: FormData): Promise<TeamActionResult> {
  const parsed = memberProfileSchema.safeParse(raw(data)); if (!parsed.success) return invalid(parsed.error);
  const db = await verifiedClient(); if (!db) return { status: "error", code: "UNAUTHENTICATED", message: "Your verified session has expired." };
  const value = parsed.data; const { error } = await db.rpc("update_team_member_profile", { target_membership_id: value.membershipId, profile_display_name: value.displayName, profile_job_title: value.jobTitle, profile_bio: value.bio, profile_is_public: value.isPublic, expected_updated_at: value.expectedUpdatedAt });
  if (error) return { status: "error", code: error.code === "40001" ? "STALE" : "UNAVAILABLE", message: error.code === "40001" ? "This profile changed in another session. Reload before saving again." : "The profile could not be updated." };
  refreshTeam(value.membershipId); return { status: "success", message: "Team profile saved." };
}
export async function changeMemberStatus(_: TeamActionResult, data: FormData): Promise<TeamActionResult> {
  const parsed = memberStatusSchema.safeParse(raw(data)); if (!parsed.success) return invalid(parsed.error);
  const db = await verifiedClient(); if (!db) return { status: "error", code: "UNAUTHENTICATED", message: "Your verified session has expired." };
  const { error } = await db.rpc("set_team_member_status", { target_membership_id: parsed.data.membershipId, desired_status: parsed.data.status });
  if (error) return { status: "error", code: error.code === "23514" ? "CONFLICT" : "UNAVAILABLE", message: error.code === "23514" ? "Every organization must keep at least one active owner." : "The membership status could not be changed." };
  refreshTeam(parsed.data.membershipId); return { status: "success", message: parsed.data.status === "active" ? "Team member activated. Assign services when they are ready." : "Team member deactivated and removed from active service assignments." };
}
export async function acceptInvitation(_: TeamActionResult, data: FormData): Promise<TeamActionResult> {
  const parsed = acceptInvitationSchema.safeParse(raw(data)); if (!parsed.success) return invalid(parsed.error);
  const db = await verifiedClient(); if (!db) return { status: "error", code: "UNAUTHENTICATED", message: "Sign in with the invited, verified email address." };
  const { error } = await db.rpc("accept_team_invitation", { target_invitation_id: parsed.data.invitationId });
  if (error) return { status: "error", code: "UNAVAILABLE", message: "This invitation is expired, revoked, or belongs to another email address." };
  revalidatePath("/dashboard"); redirect("/dashboard?joined=1");
}
