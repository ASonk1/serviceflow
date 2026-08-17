import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server"; import { safeReturnPath } from "@/features/auth/return-path";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code"); const flow = request.nextUrl.searchParams.get("flow"); const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/auth/sign-in?authError=missing", request.url));
  const supabase = await createClient(); const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth/sign-in?authError=expired", request.url));
  const response = NextResponse.redirect(new URL(flow === "recovery" ? "/auth/update-password" : next, request.url));
  if (flow === "recovery") { const { data } = await supabase.auth.getUser(); if (data.user) response.cookies.set("serviceflow-recovery", data.user.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/auth/update-password" }); }
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0"); return response;
}
