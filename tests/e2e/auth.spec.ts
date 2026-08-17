import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
const authPages = ["/auth/sign-up", "/auth/sign-in", "/auth/forgot-password", "/auth/update-password"];
const localEmail = "phase2c-user@serviceflow.test";
const initialPassword = "Local-only-password-12";
async function latestMailLink(request: import("@playwright/test").APIRequestContext, recipient: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const listing = await request.get("http://127.0.0.1:54324/api/v1/messages");
    const body = await listing.json() as { messages: { ID: string; To: { Address: string }[] }[] };
    const message = body.messages.find((item) => item.To.some((to) => to.Address === recipient));
    if (message) {
      const detail = await request.get(`http://127.0.0.1:54324/api/v1/message/${message.ID}`);
      const mail = await detail.json() as { HTML?: string; Text?: string };
      const match = (mail.HTML ?? mail.Text ?? "").match(/https?:\/\/[^\s"'<>]+/);
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Local authentication email did not arrive in Mailpit.");
}
test("anonymous protected routes redirect safely", async ({ page }) => { for (const path of ["/dashboard", "/client", "/admin", "/onboarding"]) { await page.context().clearCookies(); await page.goto(path); await expect(page).toHaveURL(new RegExp(`/auth/sign-in\\?next=${encodeURIComponent(path)}`)); } });
test("unsafe return paths are discarded", async ({ page }) => { await page.goto("/auth/sign-in?next=%2F%2Fevil.test"); const next = page.locator('input[name="next"]'); await expect(next).toHaveValue("/onboarding"); });
test("invalid callbacks fail closed", async ({ page }) => { await page.goto("/auth/callback"); await expect(page).toHaveURL(/authError=missing/); await page.goto("/auth/confirm?token_hash=invalid&type=email"); await expect(page).toHaveURL(/authError=expired/); });
test("auth pages are responsive and have no serious accessibility violations", async ({ page }) => { for (const width of [320, 375, 390, 430, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); for (const path of authPages) { await page.goto(path); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); const results = await new AxeBuilder({ page }).analyze(); expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]); } } });
test("forms expose labels, focus, and pending-safe submit controls", async ({ page }) => { await page.goto("/auth/sign-up"); await expect(page.getByLabel("Email address")).toBeVisible(); await page.keyboard.press("Tab"); await expect(page.locator(":focus-visible")).toBeVisible(); await page.getByRole("button", { name: "Create account" }).click(); await expect(page.locator("#form-message")).toContainText("Check the highlighted fields"); });
test("complete local email and password lifecycle", async ({ page, request }) => {
  await request.delete("http://127.0.0.1:54324/api/v1/messages");
  await page.goto("/auth/sign-up"); await page.getByLabel("Full name").fill("Phase Two Local User"); await page.getByLabel("Email address").fill(localEmail); await page.getByLabel("Password", { exact: true }).fill(initialPassword); await page.getByLabel("Confirm password").fill(initialPassword); await page.getByRole("button", { name: "Create account" }).click(); await expect(page.locator("#form-message")).toContainText("Check your email");
  await page.goto(await latestMailLink(request, localEmail)); await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Sign out" }).click(); await expect(page).toHaveURL(/\/auth\/sign-in/);
  await page.getByLabel("Email address").fill(localEmail); await page.getByLabel("Password").fill("definitely-wrong-password"); await page.getByRole("button", { name: "Sign in" }).click(); await expect(page.locator("#form-message")).toContainText("could not sign you in");
  await page.getByLabel("Email address").fill(localEmail); await page.getByLabel("Password").fill(initialPassword); await page.getByRole("button", { name: "Sign in" }).click(); await expect(page).toHaveURL(/\/onboarding/);
  await page.goto("/admin"); await expect(page.getByRole("heading", { name: "This page slipped off the schedule." })).toBeVisible();
  await request.delete("http://127.0.0.1:54324/api/v1/messages"); await page.goto("/auth/forgot-password"); await page.getByLabel("Email address").fill(localEmail); await page.getByRole("button", { name: "Send reset link" }).click(); await expect(page.locator("#form-message")).toContainText("If an account matches");
  await page.goto(await latestMailLink(request, localEmail)); await expect(page).toHaveURL(/\/auth\/update-password/); const updatedPassword = "Updated-local-password-12"; await page.locator("#password").fill(updatedPassword); await page.locator("#confirmPassword").fill(updatedPassword); await page.getByRole("button", { name: "Update password" }).click(); await expect(page.locator("#form-message")).toContainText("Password updated");
  await page.goto("/auth/sign-in"); await page.getByLabel("Email address").fill(localEmail); await page.getByLabel("Password").fill(updatedPassword); await page.getByRole("button", { name: "Sign in" }).click(); await expect(page).toHaveURL(/\/onboarding/);
});
