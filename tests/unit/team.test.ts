import { describe, expect, it } from "vitest";
import { acceptInvitationSchema, invitationMutationSchema, inviteTeamMemberSchema, memberProfileSchema, memberStatusSchema, normalizeEmail } from "@/features/team/schemas";
import { initialTeamResult, type TeamActionResult } from "@/features/team/action-result";
const organizationId = "10000000-0000-4000-8000-000000000001";
const recordId = "18000000-0000-4000-8000-000000000105";
describe("Phase 4B team validation", () => {
  it("normalizes invitation email deterministically", () => expect(normalizeEmail("  PERSON+Tag@Example.COM ")).toBe("person+tag@example.com"));
  it("accepts only a valid staff invitation payload", () => {
    expect(inviteTeamMemberSchema.parse({ organizationId, email: " Person@Example.com " })).toEqual({ organizationId, email: "person@example.com" });
    expect(inviteTeamMemberSchema.safeParse({ organizationId, email: "invalid" }).success).toBe(false);
    expect(inviteTeamMemberSchema.safeParse({ organizationId, email: "staff@example.com", role: "owner" }).success).toBe(false);
  });
  it("validates invitation and membership references", () => {
    expect(invitationMutationSchema.safeParse({ invitationId: recordId }).success).toBe(true);
    expect(acceptInvitationSchema.safeParse({ invitationId: "forged" }).success).toBe(false);
    expect(memberStatusSchema.safeParse({ membershipId: recordId, status: "deleted" }).success).toBe(false);
  });
  it("bounds profile fields and parses visibility", () => {
    const valid = { membershipId: recordId, displayName: " Sage ", jobTitle: " Coach ", bio: " Short bio ", isPublic: "true", expectedUpdatedAt: "2026-08-19T12:00:00+00:00" };
    expect(memberProfileSchema.parse(valid)).toMatchObject({ displayName: "Sage", jobTitle: "Coach", bio: "Short bio", isPublic: true });
    expect(memberProfileSchema.safeParse({ ...valid, bio: "x".repeat(2001) }).success).toBe(false);
    expect(memberProfileSchema.safeParse({ ...valid, unknown: "forged" }).success).toBe(false);
  });
  it("keeps stable typed action-result shapes", () => { const result: TeamActionResult = { status: "error", code: "CONFLICT", message: "Safe message." }; expect(initialTeamResult).toEqual({ status: "idle" }); expect(result.code).toBe("CONFLICT"); });
});
