const FALLBACK = "/onboarding";
export function safeReturnPath(value: unknown, fallback = FALLBACK): string {
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  let decoded = value;
  try { for (let index = 0; index < 3; index += 1) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } } catch { return fallback; }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;
  try { const url = new URL(decoded, "https://serviceflow.invalid"); return url.origin === "https://serviceflow.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback; } catch { return fallback; }
}
