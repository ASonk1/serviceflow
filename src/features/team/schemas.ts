import { z } from "zod";

const uuid = z.string().uuid("The team record is unavailable.");
export function normalizeEmail(value: string) { return value.trim().toLocaleLowerCase("en-US"); }
const email = z.string().trim().max(320).email("Enter a valid email address.").transform(normalizeEmail);
export const inviteTeamMemberSchema = z.object({ organizationId: uuid, email }).strict();
export const invitationMutationSchema = z.object({ invitationId: uuid }).strict();
export const acceptInvitationSchema = invitationMutationSchema;
export const memberStatusSchema = z.object({ membershipId: uuid, status: z.enum(["active", "inactive"]) }).strict();
export const memberProfileSchema = z.object({
  membershipId: uuid,
  displayName: z.string().trim().min(1, "Enter a display name.").max(100),
  jobTitle: z.string().trim().max(100),
  bio: z.string().trim().max(2000),
  isPublic: z.enum(["true", "false"]).transform((value) => value === "true"),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
}).strict();

