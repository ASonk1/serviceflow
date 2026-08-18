import Link from "next/link";
import { InvitationForm } from "@/components/team/team-forms";
import { getOwnerWorkspace } from "@/features/services/workspace";
export const metadata = { title: "Invite team member" };
export default async function Page() { const { organization } = await getOwnerWorkspace(); return <main id="main-content" className="dashboard-foundation service-management"><header className="service-page-header"><Link className="back-link" href="/dashboard/team">← Back to team</Link><p className="eyebrow">Secure invitation</p><h1>Invite a team member</h1><p>Invite someone to {organization.name}. This workflow can grant only the existing staff role.</p></header><section className="service-editor-card"><h2>Invitation details</h2><InvitationForm organizationId={organization.id}/></section></main>; }

