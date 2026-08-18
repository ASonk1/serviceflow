import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptInvitationForm } from "@/components/team/team-forms";
import { InviteSessionBridge } from "@/components/team/invite-session-bridge";
import { createClient } from "@/lib/supabase/server";
export const metadata = { title: "Accept team invitation" };
type Invitation = { id: string; organizationName: string; email: string; status: string; expiresAt: string };
export default async function Page({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) {
  const invitationId = (await searchParams).invitation; if (!invitationId) notFound(); const db = await createClient(); const { data: user } = await db.auth.getUser();
  if (!user.user) return <main id="main-content" className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/">ServiceFlow</Link><p className="eyebrow">Team invitation</p><h1>Verify your invitation</h1><p className="auth-subtitle">We are securely confirming the invited account in this browser.</p><InviteSessionBridge/><div className="auth-links"><Link href={`/auth/sign-in?next=${encodeURIComponent(`/team/accept?invitation=${invitationId}`)}`}>Sign in instead</Link></div></section></main>;
  const { data } = await db.rpc("get_my_team_invitation", { target_invitation_id: invitationId }); if (!data) notFound(); const invitation = data as unknown as Invitation;
  return <main id="main-content" className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/">ServiceFlow</Link><p className="eyebrow">Team invitation</p><h1>Join {invitation.organizationName}</h1><p className="auth-subtitle">This invitation is for {invitation.email} and grants staff access. It expires {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(invitation.expiresAt))}.</p>{invitation.status === "pending" ? <AcceptInvitationForm invitationId={invitation.id}/> : <div className="auth-message auth-message-error" role="alert">This invitation is {invitation.status} and can no longer be accepted.</div>}</section></main>;
}
