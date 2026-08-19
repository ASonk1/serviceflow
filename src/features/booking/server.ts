import "server-only";
import {createClient} from "@/lib/supabase/server";
import {generateAvailability,parseAvailabilityContext} from "./availability";
type RpcClient={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>};
export async function getAvailability(slug:string,serviceId:string,staffId:string|null,date:string,now=new Date()){
 const db=await createClient();const {data,error}=await (db as unknown as RpcClient).rpc("get_public_availability_context",{public_slug:slug,public_service_id:serviceId,public_staff_id:staffId,local_date:date,as_of:now.toISOString()});
 if(error||!data)return null;const parsed=parseAvailabilityContext(data);if(!parsed.success)return null;return {context:parsed.data,slots:generateAvailability(parsed.data,date,now)};
}
