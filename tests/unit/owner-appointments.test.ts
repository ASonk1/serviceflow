import {describe,expect,it} from "vitest";
import {aggregateAppointmentStatuses,groupAppointments,hasInvalidAppointmentQuery,localDayBounds,parseAppointmentQuery} from "@/features/appointments/query";

describe("owner appointment workspace",()=>{
  it("normalizes and bounds shareable query state",()=>{expect(parseAppointmentQuery({status:"forged",page:"0",size:"500",view:"calendar",q:"  Ada  "})).toMatchObject({status:"all",page:1,size:10,view:"calendar",q:"Ada"})});
  it("rejects repeated, unknown, malformed, and inverted input",()=>{const bad={status:"forged",extra:"tenant",from:"2026-10-02",to:"2026-10-01"};const parsed=parseAppointmentQuery(bad);expect(hasInvalidAppointmentQuery(bad,parsed)).toBe(true);expect(parsed.from).toBe("");expect(parseAppointmentQuery({staff:["a","b"]}).staff).toBe("")});
  it("uses DST-aware organization-local day bounds",()=>{const spring=localDayBounds("2026-03-29","Europe/Bucharest"),autumn=localDayBounds("2026-10-25","Europe/Bucharest");expect(Date.parse(spring.end)-Date.parse(spring.start)).toBe(23*60*60*1000);expect(Date.parse(autumn.end)-Date.parse(autumn.start)).toBe(25*60*60*1000)});
  it("groups calendar entries by organization-local date",()=>{const groups=groupAppointments([{starts_at:"2026-09-06T21:30:00Z",id:1},{starts_at:"2026-09-07T08:00:00Z",id:2}],"Europe/Bucharest");expect(Object.keys(groups)).toEqual(["2026-09-07"]);expect(Object.values(groups)[0]).toHaveLength(2)});
  it("aggregates operational status metrics",()=>{expect(aggregateAppointmentStatuses(["confirmed","pending_payment","completed","cancelled","no_show"])).toEqual({active:2,completed:1,cancelled:2})});
});
