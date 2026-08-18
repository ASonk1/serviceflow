"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
export function InviteSessionBridge() {
  const router = useRouter(); const [failed, setFailed] = useState(false);
  useEffect(() => { const hash = new URLSearchParams(window.location.hash.slice(1)); const accessToken = hash.get("access_token"); const refreshToken = hash.get("refresh_token"); if (!accessToken || !refreshToken) { queueMicrotask(() => setFailed(true)); return; } void createClient().auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => { if (error) { setFailed(true); return; } history.replaceState(null, "", `${location.pathname}${location.search}`); router.refresh(); }); }, [router]);
  return <div className={failed ? "auth-message auth-message-error" : "auth-message"} role={failed ? "alert" : "status"}>{failed ? "This invitation link is incomplete or expired. Ask the owner to resend it." : "Securing your invitation…"}</div>;
}
