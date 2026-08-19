import {z} from "zod";
const id=z.string().uuid("This schedule record is unavailable.");
const clock=z.string().regex(/^(?:[01]\d|2[0-3]):(?:[0-5]\d)$/,"Use a valid time.").refine(v=>Number(v.slice(3))%5===0,"Use five-minute increments.");
const weeklyBase=z.object({weekday:z.coerce.number().int().min(1).max(7),start:clock,end:clock}).refine(v=>v.start<v.end,{path:["end"],message:"End time must be after start time."});
export const createWeeklySchema=weeklyBase.extend({staffProfileId:id}).strict();
export const updateWeeklySchema=weeklyBase.extend({staffProfileId:id,intervalId:id,expectedUpdatedAt:z.string().datetime({offset:true})}).strict();
export const deleteWeeklySchema=z.object({staffProfileId:id,intervalId:id,expectedUpdatedAt:z.string().datetime({offset:true})}).strict();
const localDateTime=z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,"Enter a valid local date and time.");
const blockBase=z.object({startsAt:localDateTime,endsAt:localDateTime,reason:z.string().trim().max(500,"Keep the internal label under 500 characters.")});
export const createBlockSchema=blockBase.extend({staffProfileId:id}).strict();
export const updateBlockSchema=blockBase.extend({staffProfileId:id,blockId:id,expectedUpdatedAt:z.string().datetime({offset:true})}).strict();
export const deleteBlockSchema=z.object({staffProfileId:id,blockId:id,expectedUpdatedAt:z.string().datetime({offset:true})}).strict();
export type WeeklyValue={weekday:number;start:string;end:string};
export function intervalsOverlap(values:WeeklyValue[]){const sorted=[...values].sort((a,b)=>a.weekday-b.weekday||a.start.localeCompare(b.start));return sorted.some((v,i)=>i>0&&sorted[i-1].weekday===v.weekday&&sorted[i-1].end>v.start)}
