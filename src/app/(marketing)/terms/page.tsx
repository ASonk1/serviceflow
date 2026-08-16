import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the ServiceFlow portfolio demonstration.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "ServiceFlow demonstration terms",
    description: "Terms of use for the ServiceFlow portfolio demonstration.",
    url: "/terms",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Project information"
      title="Terms for the portfolio demo."
      description="These concise terms set expectations for viewing a non-commercial, non-functional product demonstration."
      updated="16 August 2026"
    >
      <section>
        <h2>Purpose of this site</h2>
        <p>
          ServiceFlow is presented as a software engineering and product design
          portfolio project. The current site demonstrates a visual direction and
          planned feature set for appointment-based businesses. It is not offered
          as a live scheduling service.
        </p>
      </section>
      <section>
        <h2>No transactions or service relationship</h2>
        <p>
          No account, appointment, payment, subscription, client relationship, or
          business service is created by using this site. Buttons and product
          panels lead only to public demonstration content in this phase.
        </p>
      </section>
      <section>
        <h2>Illustrative content</h2>
        <p>
          All businesses, people, appointments, metrics, prices, schedules, and
          interface states shown here are fictional examples. They should not be
          interpreted as customer testimonials, usage statistics, financial
          results, or claims about a deployed product.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          You may browse the demonstration for evaluation and learning. Do not try
          to interfere with the site, probe infrastructure without authorization,
          introduce malicious content, misrepresent the project, or use it for
          unlawful activity.
        </p>
      </section>
      <section>
        <h2>No professional or regulated advice</h2>
        <p>
          Product examples are not medical, legal, accounting, financial, or other
          professional advice. ServiceFlow is not a health-record system and makes
          no HIPAA, PCI certification, or regulated-industry compliance claim.
        </p>
      </section>
      <section>
        <h2>Availability and warranties</h2>
        <p>
          The demonstration is provided as-is and may change, move, or become
          unavailable. While the project aims for a production-quality engineering
          standard, this Phase 1 site does not warrant fitness for business use,
          uninterrupted access, or preservation of information.
        </p>
      </section>
      <section>
        <h2>Future terms</h2>
        <p>
          A real deployment with accounts or transactions would require complete,
          deployment-specific commercial terms, privacy information, support
          details, cancellation rules, and provider disclosures before launch.
          These demonstration terms are not a substitute for that work.
        </p>
      </section>
    </LegalPage>
  );
}
