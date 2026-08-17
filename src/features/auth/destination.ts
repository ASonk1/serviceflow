export type DestinationFacts = { platformAdmin: boolean; activeMembership: boolean; resumableDraft?: boolean; linkedClient: boolean; emailVerified: boolean };
export type AuthDestination = "/admin" | "/dashboard" | "/client" | "/onboarding" | "/auth/sign-in";
export function resolveDestination(facts: DestinationFacts): AuthDestination { if (facts.platformAdmin) return "/admin"; if (facts.activeMembership) return "/dashboard"; if (facts.resumableDraft) return "/onboarding"; if (facts.linkedClient) return "/client"; if (facts.emailVerified) return "/onboarding"; return "/auth/sign-in"; }
