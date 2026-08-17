import {describe,expect,it} from "vitest";
import {firstIncompleteStep,type ProgressFlags} from "@/features/onboarding/model";
import {bookingPoliciesSchema,businessIdentitySchema,locationSchema,normalizeSlug} from "@/features/onboarding/schemas";
const id="10000000-0000-4000-8000-000000000001";
describe("owner onboarding validation",()=>{
 it("normalizes safe slugs",()=>expect(normalizeSlug("  Fictional-Studio ")).toBe("fictional-studio"));
 it.each(["-studio","studio-","studio--one","studio_one","stúdio"])("rejects unsafe slug %s",slug=>expect(businessIdentitySchema.safeParse({organizationId:id,businessName:"Fictional Studio",slug}).success).toBe(false));
 it.each(["admin","onboarding","www"])("rejects reserved slug %s",slug=>expect(businessIdentitySchema.safeParse({organizationId:id,businessName:"Fictional Studio",slug}).success).toBe(false));
 it("accepts only supported regional settings",()=>{expect(locationSchema.safeParse({organizationId:id,timezone:"Europe/Bucharest",currency:"RON",countryCode:"ro",city:"Sample City",addressLine1:"",addressLine2:"",region:"",postalCode:""}).success).toBe(true);expect(locationSchema.safeParse({organizationId:id,timezone:"Mars/Olympus",currency:"CAD",countryCode:"ROU",city:"Sample City"}).success).toBe(false)});
 it("bounds and relates booking policies",()=>{const base={organizationId:id,minimumLeadMinutes:"60",bookingHorizonDays:"30",cancellationNoticeMinutes:"1440",rescheduleNoticeMinutes:"720",slotIntervalMinutes:"15"};expect(bookingPoliciesSchema.safeParse(base).success).toBe(true);expect(bookingPoliciesSchema.safeParse({...base,bookingHorizonDays:"0"}).success).toBe(false);expect(bookingPoliciesSchema.safeParse({...base,minimumLeadMinutes:"50000",bookingHorizonDays:"1"}).success).toBe(false);expect(bookingPoliciesSchema.safeParse({...base,slotIntervalMinutes:"17"}).success).toBe(false)});
});
describe("deterministic progress",()=>{it("returns the first incomplete step without trusting a browser step",()=>{const flags:ProgressFlags={"business-identity":true,location:true,"booking-policies":false,"staff-profile":false,service:false,availability:false,review:false,publish:false};expect(firstIncompleteStep(flags)).toBe("booking-policies");expect(firstIncompleteStep({...flags,"booking-policies":true})).toBe("staff-profile")})});
