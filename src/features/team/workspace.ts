import "server-only";
import { notFound } from "next/navigation";
import { getOwnerWorkspace } from "@/features/services/workspace";
import type { TeamMember, TeamWorkspace } from "./model";

export async function getTeamWorkspace() {
  const { db, organization } = await getOwnerWorkspace();
  const { data, error } = await db.rpc("get_owner_team", { target_org_id: organization.id });
  if (error || !data) throw new Error("Team information could not be loaded.");
  return { db, organization, team: data as unknown as TeamWorkspace };
}
export async function getTeamMember(membershipId: string): Promise<{ organization: Awaited<ReturnType<typeof getOwnerWorkspace>>["organization"]; member: TeamMember }> {
  const { organization, team } = await getTeamWorkspace();
  const member = team.members.find((item) => item.membershipId === membershipId);
  if (!member?.profileId || !member.profileUpdatedAt) notFound();
  return { organization, member };
}

