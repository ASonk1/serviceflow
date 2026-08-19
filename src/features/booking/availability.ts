import {z} from "zod";
import {zonedLocalToUtc} from "@/features/availability/time";
const contextSchema=z.object({organization:z.object({slug:z.string(),name:z.string(),timezone:z.string(),currency:z.string(),slotIntervalMinutes:z.number().int().positive(),minimumLeadMinutes:z.number().int().nonnegative(),bookingHorizonDays:z.number().int().positive()}),service:z.object({id:z.string().uuid(),name:z.string(),durationMinutes:z.number().int().positive(),bufferMinutes:z.number().int().nonnegative(),priceMinor:z.number().int().nonnegative(),paymentMode:z.string(),depositMinor:z.number().nullable()}),staff:z.array(z.object({id:z.string().uuid(),displayName:z.string(),bio:z.string().nullable(),jobTitle:z.string().nullable(),avatarPath:z.string().nullable()})),windows:z.array(z.object({staffId:z.string().uuid(),weekday:z.number(),start:z.string(),end:z.string()})),occupied:z.array(z.object({staffId:z.string().uuid(),startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true})}))});
export type AvailabilityContext=z.infer<typeof contextSchema>;
export type PublicSlot={startsAt:string;endsAt:string;displayTime:string;staffIds:string[]};
const localParts=(instant:Date,zone:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(instant);
export const intervalsOverlap=(aStart:number,aEnd:number,bStart:number,bEnd:number)=>aStart<bEnd&&aEnd>bStart;
export function parseAvailabilityContext(value:unknown){return contextSchema.safeParse(value)}
export function generateAvailability(context:AvailabilityContext,date:string,now=new Date()):PublicSlot[]{
 const zone=context.organization.timezone;try{new Intl.DateTimeFormat("en",{timeZone:zone}).format(now)}catch{return []}
 const today=localParts(now,zone);const targetDay=Date.parse(`${date}T00:00:00Z`),todayDay=Date.parse(`${today}T00:00:00Z`);if(!Number.isFinite(targetDay)||targetDay<todayDay||targetDay>todayDay+context.organization.bookingHorizonDays*86400000)return [];
 const notice=now.getTime()+context.organization.minimumLeadMinutes*60000,total=(context.service.durationMinutes+context.service.bufferMinutes)*60000,serviceDuration=context.service.durationMinutes*60000;
 const slots=new Map<string,PublicSlot>();
 for(const window of context.windows){const startIso=zonedLocalToUtc(`${date}T${window.start}`,zone),endIso=zonedLocalToUtc(`${date}T${window.end}`,zone);if(!startIso||!endIso)continue;const start=Date.parse(startIso),end=Date.parse(endIso);if(start>=end)continue;
  for(let candidate=start;candidate+total<=end;candidate+=context.organization.slotIntervalMinutes*60000){if(candidate<notice)continue;const occupied=context.occupied.some(item=>item.staffId===window.staffId&&intervalsOverlap(candidate,candidate+total,Date.parse(item.startsAt),Date.parse(item.endsAt)));if(occupied)continue;const key=new Date(candidate).toISOString(),existing=slots.get(key),staffIds=[...(existing?.staffIds??[]),window.staffId].sort();slots.set(key,{startsAt:key,endsAt:new Date(candidate+serviceDuration).toISOString(),displayTime:new Intl.DateTimeFormat("en",{timeZone:zone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(candidate)),staffIds:[...new Set(staffIds)]})}
 }
 return [...slots.values()].sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
}
export function publicAvailabilityError(){return {error:"Availability could not be loaded."} as const}
