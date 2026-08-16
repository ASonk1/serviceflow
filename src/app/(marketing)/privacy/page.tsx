import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for the ServiceFlow portfolio demonstration.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "ServiceFlow privacy notice",
    description: "Privacy information for the ServiceFlow portfolio demonstration.",
    url: "/privacy",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Project information"
      title="Privacy, in plain language."
      description="ServiceFlow is currently a front-end portfolio demonstration. This notice describes the current phase, not a live commercial service."
      updated="16 August 2026"
    >
      <section>
        <h2>Current demonstration status</h2>
        <p>
          This version of ServiceFlow is a static marketing and interface
          demonstration. It does not provide account registration, appointment
          booking, payment processing, email delivery, file upload, or a connected
          application database.
        </p>
      </section>
      <section>
        <h2>Information shown in the interface</h2>
        <p>
          Names, appointment details, schedules, and performance figures visible
          in product previews are fictional display content created to communicate
          the intended product design. They do not describe real customers,
          businesses, or results.
        </p>
      </section>
      <section>
        <h2>Technical hosting data</h2>
        <p>
          The hosting platform may process standard request information needed to
          deliver and protect the site, such as an IP address, browser details,
          requested URL, timestamps, and diagnostic logs. ServiceFlow does not add
          advertising trackers or a marketing contact form in this phase.
        </p>
      </section>
      <section>
        <h2>Cookies and local storage</h2>
        <p>
          The Phase 1 marketing site does not intentionally set analytics,
          advertising, account, or preference cookies. The mobile navigation uses
          temporary in-memory interface state only. Hosting infrastructure may use
          essential security mechanisms outside the application’s direct control.
        </p>
      </section>
      <section>
        <h2>Future product phases</h2>
        <p>
          Planned phases introduce authentication, tenant data, test-mode payments,
          and application email. Before those features are made available, this
          notice should be replaced with a deployment-specific policy that names
          the controller, processors, purposes, retention, user rights, and contact
          route. No compliance claim should be inferred from the product roadmap.
        </p>
      </section>
      <section>
        <h2>Sensitive and regulated information</h2>
        <p>
          Do not submit personal, payment, health, or other sensitive information
          through this demonstration. ServiceFlow does not claim HIPAA or other
          regulated-practice compliance, and is not a medical-record system.
        </p>
      </section>
    </LegalPage>
  );
}
