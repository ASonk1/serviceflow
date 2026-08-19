"use server";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {bookingSubmissionSchema,createRateKey,hashGuestToken,mapBookingError,type BookingActionState} from "./booking";

type RpcClient={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:{message:string}|null}>};
export async function createNoPaymentBooking(_:BookingActionState,formData:FormData):Promise<BookingActionState>{
  const raw=Object.fromEntries(["slug","serviceId","staff","date","startsAt","fullName","email","phone","policyAccepted","submissionKey","guestToken"].map(key=>[key,formData.get(key)]));
  const parsed=bookingSubmissionSchema.safeParse(raw);
  const fields={fullName:String(raw.fullName??""),email:String(raw.email??""),phone:String(raw.phone??"")};
  if(!parsed.success){const flattened=parsed.error.flatten();return {status:"invalid",message:"Check the highlighted fields.",fields,errors:{...flattened.fieldErrors,_form:flattened.formErrors}}}
  const values=parsed.data,requestHeaders=await headers();
  const forwarded=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()||requestHeaders.get("x-real-ip")||"unknown";
  const origin=process.env.NEXT_PUBLIC_APP_URL||"serviceflow-local";
  const db=await createClient(),rateKey=createRateKey(forwarded,values.slug,origin);
  const rate=await (db as unknown as RpcClient).rpc("check_public_booking_rate_limit",{rate_key_hash:rateKey});
  if(rate.error||rate.data!==true)return {status:"rate-limited",message:"Too many booking attempts. Please wait a few minutes and try again.",fields};
  const {data,error}=await (db as unknown as RpcClient).rpc("create_public_no_payment_booking",{
    public_slug:values.slug,public_service_id:values.serviceId,public_staff_id:values.staff==="any"?null:values.staff,
    requested_start:values.startsAt,contact_name:values.fullName,contact_email:values.email,contact_phone:values.phone,
    policy_accepted:true,submission_key:values.submissionKey,guest_token_hash:hashGuestToken(values.guestToken),
    rate_key_hash:rateKey
  });
  if(error)return {...mapBookingError(error.message),fields};
  const result=data as {reference?:unknown};
  if(typeof result?.reference!=="string")return {status:"error",message:"We could not complete the booking. Please try again.",fields};
  redirect(`/book/${values.slug}/confirmation/${encodeURIComponent(result.reference)}?token=${encodeURIComponent(values.guestToken)}`);
}
