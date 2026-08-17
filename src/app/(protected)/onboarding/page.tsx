import { notFound } from "next/navigation";
import { Logo } from "@/components/marketing/logo";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { signOutAction } from "@/features/auth/actions";
import { firstIncompleteStep, onboardingSteps, type ProgressFlags } from "@/features/onboarding/model";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Set up your business" };

export default async function Page() {
  const db = await createClient();
  const { data: organizationId, error: startError } = await db.rpc("start_owner_onboarding");
  if (startError || !organizationId) notFound();

  const [{ data: org }, { data: settings }, { data: progress }] = await Promise.all([
    db.from("organizations").select("name,slug,timezone,currency,country_code,city,address_line1,address_line2,region,postal_code,status").eq("id", organizationId).single(),
    db.from("organization_settings").select("minimum_lead_minutes,booking_horizon_days,cancellation_notice_minutes,reschedule_notice_minutes,slot_interval_minutes,guest_booking_enabled,policy_text").eq("organization_id", organizationId).single(),
    db.from("onboarding_progress").select("*").eq("organization_id", organizationId).single(),
  ]);
  if (!org || !settings || !progress) notFound();

  const flags: ProgressFlags = {
    "business-identity": !!progress.business_identity_completed_at,
    location: !!progress.location_completed_at,
    "booking-policies": !!progress.booking_policies_completed_at,
    "staff-profile": !!progress.staff_profile_completed_at,
    service: !!progress.service_completed_at,
    availability: !!progress.availability_completed_at,
    review: !!progress.review_completed_at,
    publish: !!progress.publish_completed_at,
  };
  const step = firstIncompleteStep(flags);
  const currentIndex = onboardingSteps.findIndex((item) => item.key === step);
  const current = onboardingSteps[currentIndex];

  return <main id="main-content" className="onboarding-page">
    <header className="onboarding-header">
      <Logo />
      <div className="onboarding-header-actions">
        <span className="draft-badge">Draft · not publicly bookable</span>
        <form action={signOutAction}><button className="header-sign-in">Sign out</button></form>
      </div>
    </header>
    <div className="onboarding-layout">
      <aside className="onboarding-sidebar" aria-label="Setup progress">
        <p className="eyebrow">Owner setup</p><h2>Your launch checklist</h2>
        <p>{currentIndex} of {onboardingSteps.length} steps completed</p>
        <progress value={currentIndex} max={onboardingSteps.length}>{currentIndex} of {onboardingSteps.length}</progress>
        <ol>{onboardingSteps.map((item, index) => <li key={item.key} className={flags[item.key] ? "complete" : item.key === step ? "current" : "future"} aria-current={item.key === step ? "step" : undefined}>
          <span>{flags[item.key] ? "✓" : index + 1}</span><div><strong>{item.title}</strong><small>{flags[item.key] ? "Complete" : item.key === step ? "In progress" : "Coming next"}</small></div>
        </li>)}</ol>
      </aside>
      <section className="onboarding-content" aria-labelledby="step-title">
        <p className="step-count">Step {currentIndex + 1} of {onboardingSteps.length}</p>
        <h1 id="step-title">{current.title}</h1>
        <p className="step-description">{current.description} Fields marked * are required.</p>
        <div className="draft-notice"><strong>Your setup stays private.</strong> Save at any point and return later from any browser.</div>
        <OnboardingForm step={step} organizationId={organizationId} values={{ ...org, settings }} />
      </section>
    </div>
  </main>;
}
