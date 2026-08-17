import { z } from "zod";
export const reservedSlugs = ["admin","api","auth","dashboard","client","demo","features","login","onboarding","privacy","sign-in","sign-up","support","terms","www"] as const;
export function normalizeSlug(value: string) { return value.trim().toLowerCase(); }
export const businessIdentitySchema = z.object({
  organizationId: z.uuid(), businessName: z.string().trim().min(2).max(100),
  slug: z.string().transform(normalizeSlug).pipe(z.string().min(3).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.").refine((value) => !(reservedSlugs as readonly string[]).includes(value), "This address is reserved.")),
});
const ianaTimezone = z.string().min(1).max(100).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return value.includes("/") || value === "UTC"; } catch { return false; } }, "Choose a valid IANA timezone.");
const optional = z.string().trim().max(120).transform((value) => value || undefined);
export const locationSchema = z.object({ organizationId: z.uuid(), timezone: ianaTimezone, currency: z.enum(["RON","EUR","USD","GBP"]), countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two-letter ISO country code."), city: z.string().trim().min(1).max(100), addressLine1: optional, addressLine2: optional, region: optional, postalCode: optional });
const minutes = z.coerce.number().int().min(0).max(525600);
export const bookingPoliciesSchema = z.object({ organizationId: z.uuid(), minimumLeadMinutes: minutes, bookingHorizonDays: z.coerce.number().int().min(1).max(365), cancellationNoticeMinutes: minutes, rescheduleNoticeMinutes: minutes, slotIntervalMinutes: z.coerce.number().int().min(5).max(120).refine((v) => v % 5 === 0, "Use a five-minute increment."), guestBookingEnabled: z.string().optional().transform((v) => v === "on"), policyText: z.string().trim().max(10000).optional() }).refine((v) => v.minimumLeadMinutes <= v.bookingHorizonDays * 1440, { path: ["minimumLeadMinutes"], message: "Lead time must fit inside the booking horizon." });
export const staffProfileSchema=z.object({organizationId:z.uuid(),staffName:z.string().trim().min(1).max(100),staffBio:z.string().trim().max(2000).optional(),jobTitle:z.string().trim().max(100).optional()});
export function parsePriceToMinor(value:string){const normalized=value.trim();if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized))return null;const [whole,fraction=""]=normalized.split(".");const minor=Number(whole)*100+Number(fraction.padEnd(2,"0"));return Number.isSafeInteger(minor)&&minor<=100000000?minor:null;}
export function formatMinorPrice(value:number,currency:string,locale="en"){return new Intl.NumberFormat(locale,{style:"currency",currency}).format(value/100)}
export const serviceSchema=z.object({organizationId:z.uuid(),serviceName:z.string().trim().min(1).max(120),serviceDescription:z.string().trim().max(4000).optional(),durationMinutes:z.coerce.number().int().min(5).max(480),bufferMinutes:z.coerce.number().int().min(0).max(240),price:z.string().refine(value=>parsePriceToMinor(value)!==null,"Enter a valid price with at most two decimal places.")});
export type AvailabilityInterval={weekday:number;start:string;end:string};
const timePattern=/^(?:[01]\d|2[0-3]):(?:[0-5]\d)$/;
export function normalizeIntervals(intervals:AvailabilityInterval[]){return [...intervals].sort((a,b)=>a.weekday-b.weekday||a.start.localeCompare(b.start)||a.end.localeCompare(b.end));}
export function intervalsOverlap(intervals:AvailabilityInterval[]){const sorted=normalizeIntervals(intervals);return sorted.some((item,index)=>index>0&&item.weekday===sorted[index-1].weekday&&item.start<sorted[index-1].end);}
const intervalSchema=z.object({weekday:z.number().int().min(1).max(7),start:z.string().regex(timePattern),end:z.string().regex(timePattern)}).refine(v=>v.start<v.end,"Start time must be before end time.").refine(v=>Number(v.start.slice(3))%5===0&&Number(v.end.slice(3))%5===0,"Use five-minute increments.");
export const availabilitySchema=z.object({organizationId:z.uuid(),intervals:z.string().transform((value,ctx)=>{try{return JSON.parse(value) as unknown}catch{ctx.addIssue({code:"custom",message:"Invalid availability data."});return z.NEVER}}).pipe(z.array(intervalSchema).min(1).max(35)).transform(normalizeIntervals)}).refine(v=>!intervalsOverlap(v.intervals),{path:["intervals"],message:"Availability intervals cannot overlap."}).refine(v=>new Set(v.intervals.map(i=>`${i.weekday}:${i.start}:${i.end}`)).size===v.intervals.length,{path:["intervals"],message:"Remove duplicate intervals."});
export const organizationMutationSchema=z.object({organizationId:z.uuid()});
export const unpublishSchema=organizationMutationSchema.extend({confirmation:z.literal("unpublish")});
