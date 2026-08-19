import AxeBuilder from "@axe-core/playwright";
import {expect,test,type APIRequestContext,type Page} from "@playwright/test";

const password="Fictional-phase4c-password-12";
const staffProfile="13000000-0000-4000-8000-000000000102";
const otherTenantProfile="24000000-0000-4000-8000-000000000202";

async function mailLink(request:APIRequestContext,email:string){
 for(let attempt=0;attempt<30;attempt++){
  const list=await request.get("http://127.0.0.1:54324/api/v1/messages");
  const body=await list.json() as {messages:{ID:string;To:{Address:string}[]}[]};
  const message=body.messages.find(item=>item.To.some(to=>to.Address===email));
  if(message){const detail=await request.get(`http://127.0.0.1:54324/api/v1/message/${message.ID}`);const mail=await detail.json() as {HTML?:string;Text?:string};const match=(mail.HTML??mail.Text??"").match(/https?:\/\/[^\s"'<>]+/);if(match)return match[0].replace(/&amp;/g,"&")}
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw new Error(`Recovery email did not arrive for fictional fixture ${email}.`);
}

async function recover(page:Page,request:APIRequestContext,email:string){
 await request.delete("http://127.0.0.1:54324/api/v1/messages");await page.goto("/auth/forgot-password");await page.getByLabel("Email address").fill(email);await page.getByRole("button",{name:"Send reset link"}).click();await page.goto(await mailLink(request,email));await page.locator("#password").fill(password);await page.locator("#confirmPassword").fill(password);await page.getByRole("button",{name:"Update password"}).click();await expect(page.locator("#form-message")).toBeVisible();await page.goto("/auth/sign-in");await page.getByLabel("Email address").fill(email);await page.getByLabel("Password").fill(password);await page.getByRole("button",{name:"Sign in"}).click();await expect(page).toHaveURL(/\/onboarding$/);await page.goto("/dashboard");await expect(page).toHaveURL(/\/dashboard$/);
}

function area(page:Page,name:string){return page.locator("section").filter({has:page.getByRole("heading",{name,exact:true})})}

test("owner and staff manage deterministic Phase 4C schedules",async({page,browser,request})=>{
 test.setTimeout(60_000);await recover(page,request,"owner.alpha@serviceflow.test");await page.goto("/dashboard/availability");await expect(page.getByText("Europe/Bucharest",{exact:false})).toBeVisible();await page.locator("article").filter({hasText:"Sage Alpha"}).getByRole("link",{name:"Manage schedule"}).click();await expect(page).toHaveURL(`/dashboard/availability/${staffProfile}`);
 const weekly=area(page,"Weekly availability");await weekly.getByLabel("Weekday").first().selectOption("7");await weekly.getByLabel("Start").first().fill("08:00");await weekly.getByLabel("End").first().fill("08:00");await weekly.getByRole("button",{name:"Add interval"}).click();await expect(weekly.getByText("Check the highlighted fields.")).toBeVisible();await weekly.getByLabel("Weekday").first().selectOption("7");await weekly.getByLabel("Start").first().fill("08:00");await weekly.getByLabel("End").first().fill("09:00");await weekly.getByRole("button",{name:"Add interval"}).click();await expect(weekly.getByText("Availability interval added.")).toBeVisible();let row=weekly.locator(".schedule-item").last();await row.getByLabel("End").fill("09:30");await row.getByRole("button",{name:"Save"}).click();await expect(row.getByText("Availability interval updated.")).toBeVisible();page.once("dialog",d=>d.accept());await row.getByRole("button",{name:"Remove interval"}).click();await expect(weekly.locator(".schedule-item")).toHaveCount(1);
 const blocks=area(page,"Blocked time");await blocks.getByLabel("Starts").first().fill("2026-10-12T10:00");await blocks.getByLabel("Ends").first().fill("2026-10-12T11:00");await blocks.getByLabel("Internal label").first().fill("Fictional owner block");await blocks.getByRole("button",{name:"Add blocked time"}).click();await expect(blocks.getByText("Blocked time added.")).toBeVisible();row=blocks.locator(".schedule-item").last();await row.getByLabel("Ends").fill("2026-10-12T11:30");await row.getByRole("button",{name:"Save"}).click();await expect(row.getByText("Blocked time updated.")).toBeVisible();page.once("dialog",d=>d.accept());await row.getByRole("button",{name:"Remove block"}).click();await expect(blocks.locator(".schedule-item")).toHaveCount(1);
 const context=await browser.newContext();const staff=await context.newPage();await recover(staff,request,"staff.alpha@serviceflow.test");await staff.goto("/dashboard/availability");await expect(staff.getByRole("heading",{name:"Your schedule"})).toBeVisible();await expect(staff.getByText("Europe/Bucharest",{exact:false})).toBeVisible();await expect(staff.getByText("Sky Beta")).toHaveCount(0);await staff.getByRole("link",{name:"Manage schedule"}).click();const own=area(staff,"Weekly availability");await own.getByLabel("Weekday").first().selectOption("6");await own.getByLabel("Start").first().fill("10:00");await own.getByLabel("End").first().fill("11:00");await own.getByRole("button",{name:"Add interval"}).click();await expect(own.getByText("Availability interval added.")).toBeVisible();staff.once("dialog",d=>d.accept());await own.locator(".schedule-item").last().getByRole("button",{name:"Remove interval"}).click();await expect(own.locator(".schedule-item")).toHaveCount(1);await staff.goto(`/dashboard/availability/${otherTenantProfile}`);await expect(staff.getByRole("heading",{name:"Schedule not found"})).toBeVisible();await staff.goto(`/dashboard/availability/${staffProfile}`);
 for(const width of [320,390,768,1024,1440]){await staff.setViewportSize({width,height:900});expect(await staff.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)}await staff.keyboard.press("Tab");await expect(staff.locator(":focus-visible")).toBeVisible();const axe=await new AxeBuilder({page:staff}).analyze();expect(axe.violations.filter(v=>["serious","critical"].includes(v.impact??""))).toEqual([]);await context.close();
});
