import "server-only";
import {notFound} from "next/navigation";
import {getAuthContext} from "@/features/auth/context";
import {createClient} from "@/lib/supabase/server";
export async function getOwnerWorkspace(){const context=await getAuthContext();if(!context?.emailVerified)notFound();const membership=context.activeMemberships.find(item=>item.role==="owner");if(!membership)notFound();const db=await createClient();const {data:organization}=await db.from("organizations").select("id,name,currency,timezone,status,slug").eq("id",membership.organizationId).maybeSingle();if(!organization)notFound();return{db,organization}}
