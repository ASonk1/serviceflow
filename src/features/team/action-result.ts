export type TeamField = "email" | "displayName" | "jobTitle" | "bio" | "membershipId" | "invitationId";
export type TeamActionResult = {
  status: "idle" | "error" | "success";
  code?: "VALIDATION_FAILED" | "UNAUTHENTICATED" | "FORBIDDEN" | "CONFLICT" | "STALE" | "UNAVAILABLE";
  message?: string;
  fields?: Partial<Record<TeamField, string[]>>;
};
export const initialTeamResult: TeamActionResult = { status: "idle" };

