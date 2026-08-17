import { z } from "zod";
const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string().min(12, "Password must be at least 12 characters.").max(128);
export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password."), next: z.string().optional() });
export const signUpSchema = z.object({ displayName: z.string().trim().min(2, "Enter your name.").max(80), email, password, confirmPassword: z.string(), next: z.string().optional() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
export const forgotPasswordSchema = z.object({ email });
export const updatePasswordSchema = z.object({ password, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
