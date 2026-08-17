import { describe, expect, it } from "vitest";
import { genericResetResult, genericSignInError } from "@/features/auth/action-result";
import { resolveDestination } from "@/features/auth/destination";
import { safeReturnPath } from "@/features/auth/return-path";
import { forgotPasswordSchema, signInSchema, signUpSchema, updatePasswordSchema } from "@/features/auth/schemas";
import { can } from "@/lib/authz/capabilities";
describe("auth schemas", () => {
  it("requires valid emails and twelve-character passwords", () => { expect(signUpSchema.safeParse({ displayName: "Local Owner", email: "local@example.test", password: "short", confirmPassword: "short" }).success).toBe(false); expect(signInSchema.safeParse({ email: "bad", password: "anything" }).success).toBe(false); expect(forgotPasswordSchema.safeParse({ email: "local@example.test" }).success).toBe(true); expect(updatePasswordSchema.safeParse({ password: "long-local-password", confirmPassword: "different-value" }).success).toBe(false); });
});
describe("safe return paths", () => {
  it.each(["//evil.test", "https://evil.test", "/\\evil", "/%5cevil", "%2f%2fevil.test", "/%252f%252fevil.test", "/bad%"])("rejects %s", (value) => expect(safeReturnPath(value)).toBe("/onboarding"));
  it("preserves a well-formed internal route", () => expect(safeReturnPath("/dashboard?view=today#top")).toBe("/dashboard?view=today#top"));
});
describe("capabilities", () => { it("keeps platform and tenant powers separate", () => { expect(can("platform_admin", "platform:access")).toBe(true); expect(can("platform_admin", "tenant:manage")).toBe(false); expect(can("owner", "tenant:manage")).toBe(true); expect(can("staff", "tenant:manage")).toBe(false); expect(can("client", "client:self")).toBe(true); }); });
describe("destination resolution", () => { it("uses deterministic precedence", () => { expect(resolveDestination({ platformAdmin: true, activeMembership: true, linkedClient: true, emailVerified: true })).toBe("/admin"); expect(resolveDestination({ platformAdmin: false, activeMembership: true, linkedClient: true, emailVerified: true })).toBe("/dashboard"); expect(resolveDestination({ platformAdmin: false, activeMembership: false, linkedClient: true, emailVerified: true })).toBe("/client"); expect(resolveDestination({ platformAdmin: false, activeMembership: false, linkedClient: false, emailVerified: true })).toBe("/onboarding"); }); });
describe("generic results", () => { it("do not contain identifiers", () => { expect(genericSignInError().message).not.toMatch(/email|account exists/i); expect(genericResetResult().message).toMatch(/^If an account/); }); });
