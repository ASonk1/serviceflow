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
