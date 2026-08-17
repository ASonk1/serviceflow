"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import {
  availabilitySchema, bookingPoliciesSchema, businessIdentitySchema, locationSchema,
  organizationMutationSchema, parsePriceToMinor, serviceSchema, staffProfileSchema, unpublishSchema,
} from "./schemas";
import type { OnboardingActionResult } from "./action-result";

function values(formData:FormData){return Object.fromEntries(formData.entries())}
function invalid(error:{flatten():{fieldErrors:Record<string,string[]|undefined>}}):OnboardingActionResult{return{status:"error",message:"Check the highlighted fields.",fields:error.flatten().fieldErrors}}
async function verifiedClient(){const db=await createClient();const {data}=await db.auth.getUser();return data.user?.email_confirmed_at?db:null}
function failed(message:string):OnboardingActionResult{return{status:"error",message}}
function finish(formData:FormData,message:string):OnboardingActionResult{revalidatePath("/onboarding");if(formData.get("intent")==="exit")redirect("/");return{status:"success",message}}

export async function saveBusinessIdentity(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=businessIdentitySchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");
 const {error}=await db.rpc("save_onboarding_business_identity",{target_org_id:parsed.data.organizationId,business_name:parsed.data.businessName,public_slug:parsed.data.slug});
 if(error?.code==="23505")return{status:"error",message:"Choose another business address.",fields:{slug:["That address is already in use."]}};if(error)return failed("We could not save this step. Please try again.");return finish(formData,"Business identity saved.");
}
export async function saveLocation(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=locationSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");const d=parsed.data;
 const {error}=await db.rpc("save_onboarding_location",{target_org_id:d.organizationId,timezone_name:d.timezone,currency_code:d.currency,country:d.countryCode,city_name:d.city,address1:d.addressLine1,address2:d.addressLine2,region_name:d.region,postal:d.postalCode});
 if(error)return failed("We could not save this step. Check your location details.");return finish(formData,"Location and regional settings saved.");
}
export async function saveBookingPolicies(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=bookingPoliciesSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");const d=parsed.data;
 const {error}=await db.rpc("save_onboarding_booking_policies",{target_org_id:d.organizationId,lead_minutes:d.minimumLeadMinutes,horizon_days:d.bookingHorizonDays,cancellation_minutes:d.cancellationNoticeMinutes,reschedule_minutes:d.rescheduleNoticeMinutes,interval_minutes:d.slotIntervalMinutes,guests_enabled:d.guestBookingEnabled,terms:d.policyText});
 if(error)return failed("We could not save these policies. Please review the values.");return finish(formData,"Booking policies saved.");
}
export async function saveStaffProfile(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=staffProfileSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");const d=parsed.data;
 const {error}=await db.rpc("save_onboarding_staff_profile",{target_org_id:d.organizationId,staff_name:d.staffName,staff_bio:d.staffBio,staff_job_title:d.jobTitle,public_visible:true});
 if(error)return failed("We could not save this owner profile.");return finish(formData,"Owner staff profile saved.");
}
export async function saveService(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=serviceSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");const d=parsed.data;const price=parsePriceToMinor(d.price);
 if(price===null)return{status:"error",message:"Check the highlighted fields.",fields:{price:["Enter a valid price."]}};
 const {error}=await db.rpc("save_onboarding_service",{target_org_id:d.organizationId,service_name:d.serviceName,service_description:d.serviceDescription??"",service_duration:d.durationMinutes,service_buffer:d.bufferMinutes,service_price_minor:price});
 if(error)return failed("We could not save this service.");return finish(formData,"First service saved.");
}
export async function saveAvailability(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=availabilitySchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");
 const {error}=await db.rpc("replace_onboarding_availability",{target_org_id:parsed.data.organizationId,intervals:parsed.data.intervals as unknown as Json});
 if(error)return{status:"error",message:error.code==="23P01"?"Availability intervals cannot overlap.":"We could not save this schedule.",fields:{intervals:[error.code==="23505"?"Remove duplicate intervals.":"Review every interval and try again."]}};return finish(formData,"Weekly availability saved.");
}
export async function completeReview(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=organizationMutationSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");
 const {error}=await db.rpc("complete_onboarding_review",{target_org_id:parsed.data.organizationId});if(error)return failed("Complete every required setup item before continuing.");revalidatePath("/onboarding");return{status:"success",message:"Review confirmed. Your business is ready to publish."};
}
export async function publishOrganization(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=organizationMutationSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");
 const {data,error}=await db.rpc("publish_organization",{target_org_id:parsed.data.organizationId});if(error||!data)return failed("Publication checks did not pass. Review your setup and try again.");revalidatePath("/onboarding");revalidatePath("/dashboard");revalidatePath(`/book/${data}`);redirect("/dashboard?published=1");
}
export async function unpublishOrganization(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=unpublishSchema.safeParse(values(formData));if(!parsed.success)return{status:"error",message:"Confirm that you want to unpublish.",fields:{confirmation:["Confirmation is required."]}};const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");
 const {error}=await db.rpc("unpublish_organization",{target_org_id:parsed.data.organizationId});if(error)return failed("We could not unpublish this business.");revalidatePath("/dashboard");return{status:"success",message:"Business unpublished. Its public profile is no longer available."};
}
export async function republishOrganization(_:OnboardingActionResult,formData:FormData):Promise<OnboardingActionResult>{
 const parsed=organizationMutationSchema.safeParse(values(formData));if(!parsed.success)return invalid(parsed.error);const db=await verifiedClient();if(!db)return failed("Your verified session has expired. Sign in again.");
 const {data,error}=await db.rpc("publish_organization",{target_org_id:parsed.data.organizationId});if(error||!data)return failed("This business is not ready to republish.");revalidatePath("/dashboard");revalidatePath(`/book/${data}`);return{status:"success",message:"Business republished."};
}
