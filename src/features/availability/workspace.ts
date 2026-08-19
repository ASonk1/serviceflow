import "server-only";
import {notFound} from "next/navigation";
import {getAuthContext} from "@/features/auth/context";
import {createClient} from "@/lib/supabase/server";
import {boundedPage,type AvailabilityListQuery} from "@/features/lists/query";
import type {PaginatedResult} from "@/features/services/workspace";
export async function getAvailabilityWorkspace(){
 const context=await getAuthContext();const membership=context?.activeMemberships.find(m=>m.role==="owner")??context?.activeMemberships[0];if(!membership)notFound();
 const db=await createClient();const {data:organization}=await db.from("organizations").select("id,name,timezone,status,published_at").eq("id",membership.organizationId).single();if(!organization||!["published","unpublished"].includes(organization.status)||!organization.published_at)notFound();
 const query=db.from("staff_profiles").select("id,display_name,job_title,membership_id,organization_memberships!inner(role,user_id,status,accepted_at)").eq("organization_id",organization.id).eq("status","active").eq("organization_memberships.status","active").not("organization_memberships.accepted_at","is",null).order("display_name");
 if(membership.role!=="owner")query.eq("organization_memberships.user_id",context!.userId);
 const {data:members,error}=await query;if(error)throw new Error("Schedules could not be loaded.");return{db,organization,viewerRole:membership.role,members:members??[]};
}
export type ScheduleMember={id:string;display_name:string;job_title:string|null;role:"owner"|"staff"};
export async function getAvailabilityList(query:AvailabilityListQuery){const context=await getAuthContext();const membership=context?.activeMemberships.find(m=>m.role==="owner")??context?.activeMemberships[0];if(!membership)notFound();const db=await createClient();const {data:organization}=await db.from("organizations").select("id,name,timezone,status,published_at").eq("id",membership.organizationId).single();if(!organization||!["published","unpublished"].includes(organization.status)||!organization.published_at)notFound();const run=async(page:number)=>db.rpc("list_schedule_members",{target_org_id:organization.id,search_text:query.q,sort_field:query.sort,sort_direction:query.dir,target_limit:query.size,target_offset:(page-1)*query.size});let current=query.page;let response=await run(current);if(response.error||!response.data)throw new Error("Schedules could not be loaded.");let result=response.data as unknown as Omit<PaginatedResult<ScheduleMember>,"page"|"pageSize">;const safe=boundedPage(current,result.total,query.size);if(safe!==current){current=safe;response=await run(current);if(response.error||!response.data)throw new Error("Schedules could not be loaded.");result=response.data as unknown as typeof result}return{organization,viewerRole:membership.role,result:{...result,page:current,pageSize:query.size}}}
export async function getStaffSchedule(staffProfileId:string){
 const workspace=await getAvailabilityWorkspace();const member=workspace.members.find(m=>m.id===staffProfileId);if(!member)notFound();
 const [{data:weekly,error:weeklyError},{data:blocks,error:blockError}]=await Promise.all([
  workspace.db.from("weekly_availability").select("id,weekday,start_local,end_local,updated_at").eq("staff_profile_id",staffProfileId).eq("is_active",true).order("weekday").order("start_local"),
  workspace.db.from("blocked_times").select("id,starts_at,ends_at,reason,updated_at").eq("staff_profile_id",staffProfileId).order("starts_at")]);
 if(weeklyError||blockError)throw new Error("This schedule could not be loaded.");return{...workspace,member,weekly:weekly??[],blocks:blocks??[]};
}
