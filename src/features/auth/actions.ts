"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPublicEnvironment } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "./return-path";
import { forgotPasswordSchema, signInSchema, signUpSchema, updatePasswordSchema } from "./schemas";
import { genericResetResult, genericSignInError, type AuthActionResult } from "./action-result";

function values(formData: FormData) { return Object.fromEntries(formData.entries()); }
function invalid(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }): AuthActionResult { return { status: "error", message: "Check the highlighted fields.", fields: error.flatten().fieldErrors }; }
export async function signUpAction(_: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(values(formData)); if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient(); const env = getPublicEnvironment();
  const { error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { display_name: parsed.data.displayName }, emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?flow=signup&next=${encodeURIComponent(safeReturnPath(parsed.data.next))}` } });
  if (error) return { status: "error", message: "We could not create the account. Please try again shortly." };
  return { status: "success", message: "Check your email to confirm your account before signing in." };
}
export async function signInAction(_: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(values(formData)); if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient(); const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return genericSignInError(); redirect(safeReturnPath(parsed.data.next));
}
export async function forgotPasswordAction(_: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values(formData)); if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient(); const env = getPublicEnvironment();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?flow=recovery&next=/auth/update-password` });
  return genericResetResult();
}
export async function updatePasswordAction(_: AuthActionResult, formData: FormData): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse(values(formData)); if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient(); const { data } = await supabase.auth.getUser(); const cookieStore = await cookies();
  if (!data.user || cookieStore.get("serviceflow-recovery")?.value !== data.user.id) return { status: "error", message: "This recovery session is missing or expired. Request a new reset link." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "We could not update the password. Request a new reset link and try again." };
  cookieStore.delete("serviceflow-recovery"); await supabase.auth.signOut();
  return { status: "success", message: "Password updated. You can now sign in." };
}
export async function signOutAction() { const supabase = await createClient(); await supabase.auth.signOut(); redirect("/auth/sign-in"); }
