import {z} from "zod";
export const publicSlugSchema=z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/).max(63);
export const localDateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{const [y,m,d]=value.split("-").map(Number);const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d},{message:"Choose a valid calendar date."});
const single=z.union([z.string(),z.undefined()]).transform(value=>value??"");
export const availabilityQuerySchema=z.object({service:single.pipe(z.string().uuid()),staff:single.pipe(z.union([z.literal("any"),z.string().uuid()])),date:single.pipe(localDateSchema),slot:z.union([z.string().datetime({offset:true}),z.undefined()])}).strict();
export type AvailabilityQuery=z.infer<typeof availabilityQuerySchema>;
export function parseAvailabilityQuery(value:Record<string,string|string[]|undefined>){const flat=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,Array.isArray(item)?undefined:item]));return availabilityQuerySchema.safeParse(flat)}
