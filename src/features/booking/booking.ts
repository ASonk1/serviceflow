import {createHash,randomBytes} from "node:crypto";
import {z} from "zod";

const optionalPhone=z.string().trim().max(32).refine(value=>value===""||value.length>=3,"Enter a valid phone number.");
export const bookingSubmissionSchema=z.object({
  slug:publicSlug(),serviceId:z.string().uuid(),staff:z.union([z.literal("any"),z.string().uuid()]),
  date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),startsAt:z.string().datetime({offset:true}),
  fullName:z.string().trim().min(1,"Enter your full name.").max(120),
  email:z.string().trim().toLowerCase().email("Enter a valid email address.").max(320),
  phone:optionalPhone,policyAccepted:z.literal("on",{error:"Accept the booking policy to continue."}),
  submissionKey:z.string().uuid(),guestToken:z.string().regex(/^[A-Za-z0-9_-]{40,160}$/)
}).strict();

function publicSlug(){return z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/).max(63)}
export type BookingSubmission=z.infer<typeof bookingSubmissionSchema>;
export type BookingActionState={status:"idle"|"invalid"|"slot-lost"|"rate-limited"|"error";message?:string;fields?:Partial<Record<"fullName"|"email"|"phone",string>>;errors?:Record<string,string[]>};

export const normalizeContact=(value:{fullName:string;email:string;phone?:string})=>({fullName:value.fullName.trim(),email:value.email.trim().toLowerCase(),phone:value.phone?.trim()||null});
export const hashGuestToken=(token:string)=>createHash("sha256").update(token,"utf8").digest("hex");
export const createGuestToken=()=>randomBytes(32).toString("base64url");
export const createRateKey=(address:string,slug:string,origin:string)=>createHash("sha256").update(`${origin}|${slug}|${address}`).digest("hex");
export function mapBookingError(message:string):Pick<BookingActionState,"status"|"message">{
  if(message.includes("BOOKING_SLOT_LOST"))return {status:"slot-lost",message:"That time is no longer available. Your contact details are still here while you choose another time."};
  if(message.includes("BOOKING_RATE_LIMITED"))return {status:"rate-limited",message:"Too many booking attempts. Please wait a few minutes and try again."};
  if(message.includes("BOOKING_IDEMPOTENCY_MISMATCH"))return {status:"invalid",message:"This submission has changed. Refresh the page and review it again."};
  return {status:"error",message:"We could not complete the booking. Please review the selection and try again."};
}

export const confirmationSchema=z.object({reference:z.string(),slug:z.string(),business:z.string(),service:z.string(),staff:z.string(),startsAt:z.string(),endsAt:z.string(),durationMinutes:z.number(),bufferMinutes:z.number(),priceMinor:z.number(),currency:z.string(),paymentMode:z.literal("none"),timezone:z.string(),clientName:z.string(),clientEmail:z.string(),clientPhone:z.string().nullable(),status:z.literal("confirmed"),createdAt:z.string()});
export type BookingConfirmation=z.infer<typeof confirmationSchema>;
