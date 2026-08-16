import type { Metadata } from "next";
import Link from "next/link";
import { FeatureCard } from "@/components/marketing/feature-card";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  MessageIcon,
  ShieldIcon,
  TeamIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore ServiceFlow’s planned booking, scheduling, payment, reminder, analytics, and role-aware client experiences.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "ServiceFlow features",
    description: "Explore the planned booking, team scheduling, payment, reminder, and analytics experience.",
    url: "/features",
    type: "website",
  },
};

const featureGroups = [
  {
    icon: <CalendarIcon />,
    title: "Public booking that respects the schedule",
    description: "A focused path for selecting a service, teammate, date, and genuinely available time—designed mobile first.",
    detail: "Planned for the booking phase",
  },
  {
    icon: <TeamIcon />,
    title: "Team availability with useful boundaries",
    description: "Weekly working windows, one-off blocked time, service assignments, and views shaped around owner and staff roles.",
    detail: "Planned for operations",
  },
  {
    icon: <CreditCardIcon />,
    title: "Deposits and payments in context",
    description: "Stripe test-mode payment concepts tied to the booking moment, with visible state and recovery built into the plan.",
    detail: "Test mode only",
  },
  {
    icon: <MessageIcon />,
    title: "Confirmations and reminders with purpose",
    description: "Event-driven email concepts for bookings, changes, cancellations, and the reminder that arrives before the appointment.",
    detail: "Planned with Resend",
  },
  {
    icon: <ChartIcon />,
    title: "Operational analytics, clearly defined",
    description: "Booking pace, successful test payments, client return, popular services, and team rhythm without inflated promises.",
    detail: "Simple, bounded insights",
  },
  {
    icon: <ShieldIcon />,
    title: "A credible multi-tenant foundation",
    description: "Strict organization context, role-aware access, audit history, server-side validation, and defense-in-depth are core design inputs.",
    detail: "Security-gated roadmap",
  },
];

export default function FeaturesPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="The product map"
        title={<>Everything around the appointment, <span className="gradient-text">moving as one.</span></>}
        description="ServiceFlow is designed to connect the booking experience clients see with the operational clarity teams need—without pretending complexity does not exist."
      >
        <Link href="/demo" className="button button-light">See the interface <ArrowRightIcon /></Link>
        <Link href="#capabilities" className="button button-ghost-light">Explore capabilities</Link>
      </PageHero>

      <section className="section feature-catalog" id="capabilities" aria-labelledby="capabilities-title">
        <div className="shell">
          <SectionHeading
            eyebrow="Core capabilities"
            title={<span id="capabilities-title">A product surface built around real operating moments.</span>}
            description="The marketing foundation previews the full direction. Functional behavior arrives phase by phase behind dedicated verification gates."
          />
          <div className="feature-grid feature-grid-catalog">
            {featureGroups.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
        </div>
      </section>

      <section className="section detail-section" aria-labelledby="details-title">
        <div className="shell detail-layout">
          <div>
            <p className="eyebrow">Designed for calm confidence</p>
            <h2 id="details-title">Details that make a scheduling product feel dependable.</h2>
          </div>
          <div className="detail-list">
            {[
              ["Explicit time context", "Local business timezone labels and DST-aware planning prevent an available time from becoming an ambiguous one."],
              ["States for real life", "Loading, empty, error, conflict, and cancelled states are part of the experience—not afterthoughts."],
              ["Permission-shaped views", "Owners, staff, clients, and platform administrators see only the controls and context their role needs."],
              ["Accessible by default", "Semantic structure, keyboard paths, visible focus, generous targets, reduced motion, and high contrast guide every surface."],
            ].map(([title, description]) => (
              <article key={title}>
                <span><CheckIcon /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section comparison-section" aria-labelledby="roles-feature-title">
        <div className="shell">
          <SectionHeading
            eyebrow="One system, considered views"
            title={<span id="roles-feature-title">Useful to each role without exposing everything to everyone.</span>}
            align="center"
          />
          <div className="role-comparison">
            <article><span><ChartIcon /></span><h3>Owner</h3><p>Business overview, services, team, clients, payments, analytics, and important activity.</p></article>
            <article><span><ClockIcon /></span><h3>Staff</h3><p>A focused assigned schedule, personal availability, and the appointment actions they are allowed to take.</p></article>
            <article><span><CalendarIcon /></span><h3>Client</h3><p>A clear booking path and a simple place to review, reschedule, or cancel their own appointments.</p></article>
          </div>
        </div>
      </section>
      <FinalCta />
    </main>
  );
}
