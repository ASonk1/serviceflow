export type AvailabilityField = "staffProfileId"|"intervalId"|"weekday"|"start"|"end"|"blockId"|"startsAt"|"endsAt"|"reason";
export type AvailabilityActionResult={status:"idle"|"error"|"success";code?:"VALIDATION_FAILED"|"UNAUTHENTICATED"|"FORBIDDEN"|"CONFLICT"|"STALE"|"UNAVAILABLE";message?:string;fields?:Partial<Record<AvailabilityField,string[]>>};
export const initialAvailabilityResult:AvailabilityActionResult={status:"idle"};
