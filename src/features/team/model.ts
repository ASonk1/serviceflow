export type TeamMember = {
  membershipId: string; email: string; role: "owner" | "staff"; membershipStatus: "active" | "inactive";
  acceptedAt: string | null; profileId: string | null; displayName: string | null; jobTitle: string | null;
  bio: string | null; isPublic: boolean | null; profileStatus: "active" | "inactive" | null;
  profileUpdatedAt: string | null; activeServiceCount: number;
};
export type TeamInvitation = {
  id: string; email: string; role: "staff"; status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string; createdAt: string; lastSentAt: string; acceptedAt: string | null; revokedAt: string | null;
};
export type TeamWorkspace = { members: TeamMember[]; invitations: TeamInvitation[] };

