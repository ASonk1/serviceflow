import "server-only";
import { notFound } from "next/navigation";
import { getOwnerWorkspace } from "@/features/services/workspace";
import type { TeamMember, TeamWorkspace } from "./model";
import {boundedPage,type InvitationListQuery,type MemberListQuery} from "@/features/lists/query";
import type {PaginatedResult} from "@/features/services/workspace";

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

export async function getTeamLists(memberQuery:MemberListQuery,invitationQuery:InvitationListQuery){
 const {db,organization}=await getOwnerWorkspace();
 const members=async(page:number)=>db.rpc("list_owner_team_members",{target_org_id:organization.id,search_text:memberQuery.q,role_filter:memberQuery.role,status_filter:memberQuery.status,sort_field:memberQuery.sort,sort_direction:memberQuery.dir,target_limit:memberQuery.size,target_offset:(page-1)*memberQuery.size});
 const invitations=async(page:number)=>db.rpc("list_owner_invitations",{target_org_id:organization.id,search_text:invitationQuery.q,status_filter:invitationQuery.status,sort_field:invitationQuery.sort,sort_direction:invitationQuery.dir,target_limit:invitationQuery.size,target_offset:(page-1)*invitationQuery.size});
 let memberPage=memberQuery.page,invitePage=invitationQuery.page;let [memberResponse,inviteResponse]=await Promise.all([members(memberPage),invitations(invitePage)]);if(memberResponse.error||inviteResponse.error||!memberResponse.data||!inviteResponse.data)throw new Error("Team information could not be loaded.");let memberResult=memberResponse.data as unknown as Omit<PaginatedResult<TeamMember>,"page"|"pageSize">;let inviteResult=inviteResponse.data as unknown as Omit<PaginatedResult<import("./model").TeamInvitation>,"page"|"pageSize">;const safeMember=boundedPage(memberPage,memberResult.total,memberQuery.size),safeInvite=boundedPage(invitePage,inviteResult.total,invitationQuery.size);if(safeMember!==memberPage){memberPage=safeMember;memberResponse=await members(memberPage);if(memberResponse.error||!memberResponse.data)throw new Error("Team information could not be loaded.");memberResult=memberResponse.data as unknown as typeof memberResult}if(safeInvite!==invitePage){invitePage=safeInvite;inviteResponse=await invitations(invitePage);if(inviteResponse.error||!inviteResponse.data)throw new Error("Team information could not be loaded.");inviteResult=inviteResponse.data as unknown as typeof inviteResult}return{organization,members:{...memberResult,page:memberPage,pageSize:memberQuery.size},invitations:{...inviteResult,page:invitePage,pageSize:invitationQuery.size}};
}
