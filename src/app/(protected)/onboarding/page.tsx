import { notFound } from "next/navigation";
import { Logo } from "@/components/marketing/logo";
import { OnboardingForm, type OnboardingValues } from "@/components/onboarding/onboarding-form";
import { signOutAction } from "@/features/auth/actions";
import { editableStep, firstIncompleteStep, onboardingSteps, type ProgressFlags } from "@/features/onboarding/model";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/lib/env/public";

export const metadata={title:"Set up your business"};
export default async function Page({searchParams}:{searchParams:Promise<{step?:string}>}){
 const db=await createClient();const {data:organizationId,error:startError}=await db.rpc("start_owner_onboarding");if(startError||!organizationId)notFound();
 const [{data:org},{data:settings},{data:progress}]=await Promise.all([
  db.from("organizations").select("name,slug,logo_path,timezone,currency,country_code,city,address_line1,address_line2,region,postal_code,status").eq("id",organizationId).single(),
  db.from("organization_settings").select("minimum_lead_minutes,booking_horizon_days,cancellation_notice_minutes,reschedule_notice_minutes,slot_interval_minutes,guest_booking_enabled,policy_text").eq("organization_id",organizationId).single(),
  db.from("onboarding_progress").select("*").eq("organization_id",organizationId).single(),
 ]);if(!org||!settings||!progress)notFound();
 const [{data:staff},{data:service},{data:availability}]=await Promise.all([
  progress.staff_profile_id?db.from("staff_profiles").select("id,display_name,bio,job_title,avatar_path,is_public,status").eq("organization_id",organizationId).eq("id",progress.staff_profile_id).maybeSingle():Promise.resolve({data:null}),
  progress.service_id?db.from("services").select("name,description,duration_minutes,buffer_after_minutes,price_minor,currency,status").eq("organization_id",organizationId).eq("id",progress.service_id).maybeSingle():Promise.resolve({data:null}),
  progress.staff_profile_id?db.from("weekly_availability").select("weekday,start_local,end_local").eq("organization_id",organizationId).eq("staff_profile_id",progress.staff_profile_id).eq("is_active",true).order("weekday").order("start_local"):Promise.resolve({data:[]}),
 ]);
 const flags:ProgressFlags={"business-identity":!!progress.business_identity_completed_at,location:!!progress.location_completed_at,"booking-policies":!!progress.booking_policies_completed_at,"staff-profile":!!progress.staff_profile_completed_at,service:!!progress.service_completed_at,availability:!!progress.availability_completed_at,review:!!progress.review_completed_at,publish:!!progress.publish_completed_at};
 const requested=editableStep((await searchParams).step,flags);const step=requested??firstIncompleteStep(flags);const editing=Boolean(requested);const currentIndex=onboardingSteps.findIndex(item=>item.key===step);const current=onboardingSteps[currentIndex];
 const values:OnboardingValues={...org,settings,staff:staff??null,service:service??null,availability:(availability??[]).map(item=>({weekday:item.weekday,start:item.start_local.slice(0,5),end:item.end_local.slice(0,5)}))};
 return <main id="main-content" className="onboarding-page"><header className="onboarding-header"><Logo/><div className="onboarding-header-actions"><span className="draft-badge">Draft · not publicly bookable</span><form action={signOutAction}><button className="header-sign-in">Sign out</button></form></div></header><div className="onboarding-layout"><aside className="onboarding-sidebar" aria-label="Setup progress"><p className="eyebrow">Owner setup</p><h2>Your launch checklist</h2><p>{onboardingSteps.filter(item=>flags[item.key]).length} of {onboardingSteps.length} steps completed</p><progress value={onboardingSteps.filter(item=>flags[item.key]).length} max={onboardingSteps.length}/><ol>{onboardingSteps.map((item,index)=><li key={item.key} className={flags[item.key]?"complete":item.key===step?"current":"future"} aria-current={item.key===step?"step":undefined}><span>{flags[item.key]?"✓":index+1}</span><div><strong>{item.title}</strong><small>{flags[item.key]?(item.key===step?"Editing":"Complete"):item.key===step?"In progress":"Coming next"}</small></div></li>)}</ol></aside><section className="onboarding-content" aria-labelledby="step-title"><p className="step-count">{editing?"Editing completed step":`Step ${currentIndex+1} of ${onboardingSteps.length}`}</p><h1 id="step-title">{current.title}</h1><p className="step-description">{current.description} Fields marked * are required.</p><div className="draft-notice"><strong>Your setup stays private.</strong> Progress is saved to your organization and publication runs only after every database check passes.</div><OnboardingForm step={step} organizationId={organizationId} values={values} supabaseUrl={getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL} editing={editing}/></section></div></main>;
}
