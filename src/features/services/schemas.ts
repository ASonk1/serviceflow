import {z} from "zod";
const uuid=z.string().uuid("Invalid service reference.");
export function currencyFractionDigits(currency:string){return new Intl.NumberFormat("en",{style:"currency",currency}).resolvedOptions().maximumFractionDigits??2}
export function parseCurrencyToMinor(value:string,currency:string){const digits=currencyFractionDigits(currency);const normalized=value.trim();const fractionPattern=digits?`(?:\\.\\d{1,${digits}})?`:"";if(!new RegExp(`^(?:0|[1-9]\\d*)${fractionPattern}$`).test(normalized))return null;const [whole="0",fraction=""]=normalized.split(".");const amount=Number(whole)*(10**digits)+Number(fraction.padEnd(digits,"0")||"0");return Number.isSafeInteger(amount)&&amount<=1000000000?amount:null}
export function formatServicePrice(value:number,currency:string,locale="en-US"){return new Intl.NumberFormat(locale,{style:"currency",currency}).format(value/(10**currencyFractionDigits(currency)))}
export const serviceFields=z.object({name:z.string().trim().min(1,"Enter a service name.").max(120),description:z.string().trim().max(4000).default(""),durationMinutes:z.coerce.number().int().min(5).max(480),bufferMinutes:z.coerce.number().int().min(0).max(240),price:z.string().trim().min(1,"Enter a price.").max(20)}).strict();
export const createServiceSchema=serviceFields.extend({organizationId:uuid}).strict();
export const updateServiceSchema=serviceFields.extend({serviceId:uuid}).strict();
export const serviceStatusSchema=z.object({serviceId:uuid,status:z.enum(["active","archived"])}).strict();
export const serviceAssignmentSchema=z.object({serviceId:uuid,staffId:uuid,assigned:z.enum(["true","false"]).transform(v=>v==="true")}).strict();
export function normalizeServiceForm(input:{name:string;description?:string;durationMinutes:number;bufferMinutes:number;price:string}){return{name:input.name.trim(),description:(input.description??"").trim(),durationMinutes:input.durationMinutes,bufferMinutes:input.bufferMinutes,price:input.price.trim()}}
