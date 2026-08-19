import AxeBuilder from "@axe-core/playwright";
import {expect,test} from "@playwright/test";
const slug="alpha-wellness-lab",service="12000000-0000-4000-8000-000000000101";

test("public discovery and shareable availability selection",async({page})=>{
 const failures:string[]=[];page.on("console",message=>{if(message.type()==="error")failures.push(message.text())});page.on("requestfailed",request=>failures.push(request.url()));
 await page.goto(`/book/${slug}`);await expect(page.getByRole("heading",{name:"Alpha Wellness Lab"})).toBeVisible();await expect(page.getByText("Private fictional owner note A.")).toHaveCount(0);
 await page.getByRole("link",{name:/Choose Fictional Movement Session/}).click();await expect(page).toHaveURL(new RegExp(`service=${service}`));await expect(page.getByLabel("Team member")).toHaveValue("any");
 await page.getByLabel("Business date").fill("2026-09-07");await page.getByRole("button",{name:"Update availability"}).click();await expect(page.getByRole("heading",{name:"Available times"})).toBeVisible();
 await page.locator(".slot-button").first().click();await expect(page.getByRole("heading",{name:/Fictional Movement Session at/})).toBeVisible();await expect(page.getByText("This is only a selection. It is not reserved or confirmed.")).toBeVisible();
 const url=page.url();await page.reload();await expect(page).toHaveURL(url);await expect(page.getByText("This is only a selection. It is not reserved or confirmed.")).toBeVisible();
 await page.getByLabel("Team member").selectOption("13000000-0000-4000-8000-000000000102");await page.getByRole("button",{name:"Update availability"}).click();
 for(const width of [320,430]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)}
 await page.keyboard.press("Tab");await expect(page.locator(":focus-visible")).toBeVisible();const axe=await new AxeBuilder({page}).analyze();expect(axe.violations.filter(item=>["serious","critical"].includes(item.impact??""))).toEqual([]);expect(failures).toEqual([]);
});

test("public booking rejects unavailable and stale selections",async({page})=>{
 await page.goto("/book/unknown-business");await expect(page.getByRole("heading",{name:"This booking page is not public."})).toBeVisible();
 await page.goto("/book/isolation-suspended-fixture");await expect(page.getByRole("heading",{name:"This booking page is not public."})).toBeVisible();
 await page.goto(`/book/${slug}/availability?service=23000000-0000-4000-8000-000000000201&staff=any&date=2026-09-07`);await expect(page.getByText("That service is no longer available.")).toBeVisible();
 await page.goto(`/book/${slug}/availability?service=${service}&staff=any&date=2026-09-08`);await expect(page.getByText("No availability on this date")).toBeVisible();
 await page.getByRole("link",{name:"Change service"}).click();await expect(page).toHaveURL(`/book/${slug}`);
});
