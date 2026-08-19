const parts=(date:Date,zone:string)=>Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
export function zonedLocalToUtc(value:string,zone:string){
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);if(!match)return null;
 const wanted={year:match[1],month:match[2],day:match[3],hour:match[4],minute:match[5]};const naive=Date.UTC(+match[1],+match[2]-1,+match[3],+match[4],+match[5]);
 const offsets=new Set<number>();for(const delta of [-86400000,-21600000,0,21600000,86400000]){const sample=naive+delta;const p=parts(new Date(sample),zone);const represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);offsets.add(represented-sample)}
 const matches=[...offsets].map(offset=>new Date(naive-offset)).filter(d=>{const p=parts(d,zone);return Object.entries(wanted).every(([k,v])=>p[k]===v)});
 return matches.length===1?matches[0].toISOString():null;
}
export function utcToLocalInput(value:string,zone:string){const p=parts(new Date(value),zone);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`}
export function formatZoned(value:string,zone:string){return new Intl.DateTimeFormat("en",{timeZone:zone,dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}
