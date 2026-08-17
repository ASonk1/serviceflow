import "server-only";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/context";
import type { AuthDestination } from "@/features/auth/destination";
export async function requireDestination(expected: AuthDestination, currentPath: string) {
  const context = await getAuthContext();
  if (!context) redirect(`/auth/sign-in?next=${encodeURIComponent(currentPath)}`);
  if (context.destination !== expected) notFound();
  return context;
}
