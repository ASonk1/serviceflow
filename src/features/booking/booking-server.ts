import "server-only";
import {createClient} from "@/lib/supabase/server";
import {confirmationSchema,hashGuestToken} from "./booking";
import {z} from "zod";

type RpcClient={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>};
const policySchema=z.object({text:z.string().max(10000),version:z.string().regex(/^[0-9a-f]{64}$/)});
export async function getBookingPolicy(slug:string,serviceId:string){const db=await createClient();const {data,error}=await (db as unknown as RpcClient).rpc("get_public_booking_policy",{public_slug:slug,public_service_id:serviceId});if(error)return null;const parsed=policySchema.safeParse(data);return parsed.success?parsed.data:null}
export async function getBookingConfirmation(reference:string,token?:string){const db=await createClient();const {data,error}=await (db as unknown as RpcClient).rpc("get_public_booking_confirmation",{public_reference:reference,guest_token_hash:token?hashGuestToken(token):null});if(error||!data)return null;const parsed=confirmationSchema.safeParse(data);return parsed.success?parsed.data:null}
