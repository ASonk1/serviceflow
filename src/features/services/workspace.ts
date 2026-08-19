import "server-only";
import {notFound} from "next/navigation";
import {getAuthContext} from "@/features/auth/context";
import {createClient} from "@/lib/supabase/server";
import {boundedPage, type ServiceListQuery} from "@/features/lists/query";
export async function getOwnerWorkspace(){const context=await getAuthContext();if(!context?.emailVerified)notFound();const membership=context.activeMemberships.find(item=>item.role==="owner");if(!membership)notFound();const db=await createClient();const {data:organization}=await db.from("organizations").select("id,name,currency,timezone,status,slug").eq("id",membership.organizationId).maybeSingle();if(!organization)notFound();return{db,organization}}

export type ServiceListItem={id:string;name:string;description:string|null;duration_minutes:number;buffer_after_minutes:number;price_minor:number;status:"draft"|"active"|"archived";updated_at:string;active_staff_count:number};
export type PaginatedResult<T>={items:T[];total:number;organizationTotal:number;page:number;pageSize:number};

export async function getServiceList(query:ServiceListQuery):Promise<{organization:Awaited<ReturnType<typeof getOwnerWorkspace>>["organization"];result:PaginatedResult<ServiceListItem>}> {
 const {db,organization}=await getOwnerWorkspace();
 const run=async(page:number)=>db.rpc("list_managed_services",{target_org_id:organization.id,search_text:query.q,status_filter:query.status,sort_field:query.sort,sort_direction:query.dir,target_limit:query.size,target_offset:(page-1)*query.size});
 let current=query.page;let response=await run(current);if(response.error||!response.data)throw new Error("Services could not be loaded.");let result=response.data as unknown as Omit<PaginatedResult<ServiceListItem>,"page"|"pageSize">;const safe=boundedPage(current,result.total,query.size);if(safe!==current){current=safe;response=await run(current);if(response.error||!response.data)throw new Error("Services could not be loaded.");result=response.data as unknown as Omit<PaginatedResult<ServiceListItem>,"page"|"pageSize">}return{organization,result:{...result,page:current,pageSize:query.size}};
}
