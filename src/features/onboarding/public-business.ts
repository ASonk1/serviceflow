import {z} from "zod";
import {createClient} from "@/lib/supabase/server";
const publicBusinessSchema=z.object({slug:z.string(),name:z.string(),city:z.string().nullable(),region:z.string().nullable(),countryCode:z.string().nullable(),timezone:z.string(),currency:z.enum(["RON","EUR","USD","GBP"]),staff:z.array(z.object({displayName:z.string(),bio:z.string().nullable(),jobTitle:z.string().nullable()})),services:z.array(z.object({name:z.string(),description:z.string().nullable(),durationMinutes:z.number(),bufferMinutes:z.number(),priceMinor:z.number()})),availability:z.array(z.object({weekday:z.number(),start:z.string(),end:z.string()}))});
export type PublicBusiness=z.infer<typeof publicBusinessSchema>;
export async function getPublicBusiness(slug:string){const db=await createClient();const {data,error}=await db.rpc("get_public_business",{public_slug:slug});if(error||!data)return null;const parsed=publicBusinessSchema.safeParse(data);return parsed.success?parsed.data:null}
