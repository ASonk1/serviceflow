export type ProductRole = "platform_admin" | "owner" | "staff" | "client";
export type Capability = "platform:access" | "tenant:access" | "tenant:manage" | "staff:self" | "client:self";
const policy: Record<ProductRole, readonly Capability[]> = { platform_admin: ["platform:access"], owner: ["tenant:access", "tenant:manage", "staff:self"], staff: ["tenant:access", "staff:self"], client: ["client:self"] };
export function can(role: ProductRole, capability: Capability) { return policy[role].includes(capability); }
