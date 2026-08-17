export type AuthField = "displayName" | "email" | "password" | "confirmPassword";
export type AuthActionResult = { status: "idle" | "error" | "success"; message?: string; fields?: Partial<Record<AuthField, string[]>> };
export const initialAuthActionResult: AuthActionResult = { status: "idle" };
export const genericSignInError = (): AuthActionResult => ({ status: "error", message: "We could not sign you in with those details." });
export const genericResetResult = (): AuthActionResult => ({ status: "success", message: "If an account matches that email, a password reset link is on its way." });
