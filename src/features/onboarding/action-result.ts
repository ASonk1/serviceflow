import type { OnboardingStep } from "./model";
export type OnboardingField = "businessName"|"slug"|"timezone"|"currency"|"countryCode"|"city"|"addressLine1"|"addressLine2"|"region"|"postalCode"|"minimumLeadMinutes"|"bookingHorizonDays"|"cancellationNoticeMinutes"|"rescheduleNoticeMinutes"|"slotIntervalMinutes"|"policyText";
export type OnboardingActionResult = { status:"idle"|"error"|"success"; message?:string; fields?:Partial<Record<OnboardingField,string[]>>; nextStep?:OnboardingStep };
export const initialOnboardingResult: OnboardingActionResult = { status:"idle" };
