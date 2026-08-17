"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { AuthActionResult } from "@/features/auth/action-result";
import { initialAuthActionResult } from "@/features/auth/action-result";
type Kind = "sign-up" | "sign-in" | "forgot" | "update";
type Props = { kind: Kind; action: (state: AuthActionResult, formData: FormData) => Promise<AuthActionResult>; next?: string; notice?: string };
const content = {
  "sign-up": { title: "Create your account", subtitle: "Start with a secure ServiceFlow identity.", submit: "Create account" },
  "sign-in": { title: "Welcome back", subtitle: "Sign in to continue to your workspace.", submit: "Sign in" },
  forgot: { title: "Reset your password", subtitle: "We’ll send reset instructions if an account matches.", submit: "Send reset link" },
  update: { title: "Choose a new password", subtitle: "Use at least 12 characters.", submit: "Update password" },
} as const;
export function AuthForm({ kind, action, next, notice }: Props) {
  const [state, formAction, pending] = useActionState(action, initialAuthActionResult); const copy = content[kind];
  const fieldError = (name: "displayName" | "email" | "password" | "confirmPassword") => state.fields?.[name]?.join(" ");
  return <main id="main-content" className="auth-page"><section className="auth-card" aria-labelledby="auth-title">
    <Link href="/" className="auth-brand">ServiceFlow</Link><p className="eyebrow">Secure account access</p><h1 id="auth-title">{copy.title}</h1><p className="auth-subtitle">{copy.subtitle}</p>
    {notice ? <div className="auth-message auth-message-error" role="alert">{notice}</div> : null}
    <form action={formAction} className="auth-form" noValidate aria-describedby={state.message ? "form-message" : undefined}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {kind === "sign-up" ? <Field name="displayName" label="Full name" autoComplete="name" error={fieldError("displayName")} /> : null}
      {kind !== "update" ? <Field name="email" label="Email address" type="email" autoComplete="email" error={fieldError("email")} /> : null}
      {kind !== "forgot" ? <Field name="password" label={kind === "update" ? "New password" : "Password"} type="password" autoComplete={kind === "sign-in" ? "current-password" : "new-password"} hint={kind === "sign-up" || kind === "update" ? "At least 12 characters." : undefined} error={fieldError("password")} /> : null}
      {kind === "sign-up" || kind === "update" ? <Field name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" error={fieldError("confirmPassword")} /> : null}
      {state.message ? <div id="form-message" className={`auth-message auth-message-${state.status}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</div> : null}
      <button className="button button-primary button-full" type="submit" disabled={pending} aria-disabled={pending}>{pending ? "Please wait…" : copy.submit}</button>
    </form>
    <div className="auth-links">{kind === "sign-in" ? <><Link href="/auth/forgot-password">Forgot password?</Link><Link href="/auth/sign-up">Create an account</Link></> : null}{kind === "sign-up" || kind === "forgot" || kind === "update" ? <Link href="/auth/sign-in">Back to sign in</Link> : null}</div>
  </section></main>;
}
function Field({ name, label, type = "text", autoComplete, hint, error }: { name: string; label: string; type?: string; autoComplete: string; hint?: string; error?: string }) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div className="form-field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} autoComplete={autoComplete} required aria-invalid={Boolean(error)} aria-describedby={describedBy} />{hint ? <p id={`${name}-hint`} className="field-hint">{hint}</p> : null}{error ? <p id={`${name}-error`} className="field-error">{error}</p> : null}</div>;
}
