import type { Metadata } from "next";
import Link from "next/link";
import { FeatureCard } from "@/components/marketing/feature-card";
import { FinalCta } from "@/components/marketing/final-cta";
import { ProductPreview } from "@/components/marketing/product-preview";
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
  title: "Scheduling that keeps the whole business in flow",
  description:
    "ServiceFlow is a portfolio SaaS concept for managing bookings, teams, payments, reminders, and client relationships in one calm workspace.",
};

const features = [
  {
    icon: <CalendarIcon />,
    title: "Booking without the back-and-forth",
    description: "A clear, mobile-ready path from service selection to an available time and a confident confirmation.",
    detail: "Public booking · Timezone aware",
  },
  {
    icon: <TeamIcon />,
    title: "One schedule, every teammate",
    description: "Connect services to the right people, shape weekly availability, and protect blocked time without calendar chaos.",
    detail: "Roles · Availability · Blocks",
  },
  {
    icon: <CreditCardIcon />,
    title: "Payments built into the moment",
    description: "Plan for deposits or full payment at booking, with trustworthy status handling and an unmistakable test-mode experience.",
    detail: "Stripe test mode · Deposits",
  },
  {
    icon: <MessageIcon />,
    title: "The right message, on time",
    description: "Confirmations, changes, cancellations, and reminders keep clients informed while the team stays focused.",
    detail: "Email confirmations · Reminders",
  },
  {
    icon: <ChartIcon />,
    title: "Signals that support decisions",
    description: "Understand booking pace, collected revenue, client return, and service demand without an analytics maze.",
    detail: "Bookings · Revenue · Clients",
  },
  {
    icon: <ShieldIcon />,
    title: "Designed tenant by tenant",
    description: "A production-minded architecture plans for strict organization separation, role checks, audit history, and safe defaults.",
    detail: "Multi-tenant · Auditable",
  },
];

const roles = [
  {
    number: "01",
    title: "Owners see the business, not busywork.",
    description: "Shape services and the team, handle every appointment, and read the operating pulse from one composed workspace.",
    points: ["Business-wide schedule", "Team and service controls", "Revenue and client signals"],
  },
  {
    number: "02",
    title: "Staff get a focused day.",
    description: "See assigned appointments, protect availability, and update the work that belongs to them—without admin noise.",
    points: ["Personal agenda", "Own availability", "Clear appointment context"],
  },
  {
    number: "03",
    title: "Clients book with confidence.",
    description: "Choose a service and time in a calm flow, then return to reschedule, cancel, or review the appointment later.",
    points: ["Mobile-first booking", "Explicit local times", "Simple appointment history"],
  },
];

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="shell hero-inner">
          <div className="hero-copy">
            <p className="hero-badge"><span /> Built for appointment-based work</p>
            <h1>Turn scattered schedules into <span className="gradient-text">one calm flow.</span></h1>
            <p className="hero-lede">
              ServiceFlow brings bookings, team availability, payments,
              reminders, and business insight into one polished workspace—so
              every appointment feels considered before it even begins.
            </p>
            <div className="hero-actions">
              <Link href="/demo" className="button button-primary">
                Explore the demo <ArrowRightIcon />
              </Link>
              <Link href="/features" className="button button-secondary">
                See every feature
              </Link>
            </div>
            <ul className="hero-trust" aria-label="Product principles">
              <li><CheckIcon /> Responsive by design</li>
              <li><CheckIcon /> Role-aware foundation</li>
              <li><CheckIcon /> Test-mode only</li>
            </ul>
          </div>
          <div className="hero-preview-wrap">
            <div className="preview-float preview-float-top" aria-hidden="true">
              <span className="float-icon float-icon-mint"><CheckIcon /></span>
              <span><strong>Booking confirmed</strong><small>Reminder scheduled</small></span>
            </div>
            <ProductPreview />
            <div className="preview-float preview-float-bottom" aria-hidden="true">
              <span className="avatar-stack"><i>AR</i><i>MC</i><i>LM</i></span>
              <span><strong>Team aligned</strong><small>3 schedules in sync</small></span>
            </div>
          </div>
        </div>
        <div className="shell demo-disclosure">
          <span>Portfolio demonstration</span>
          <p>This phase is a static product experience. No live accounts, bookings, payments, or customer data.</p>
        </div>
      </section>

      <section className="section feature-section" aria-labelledby="feature-title">
        <div className="shell">
          <SectionHeading
            eyebrow="One connected workspace"
            title={<span id="feature-title">Less stitching tools together. More time moving the business forward.</span>}
            description="Every surface is designed around the rhythm of an appointment—from the first open slot to the signal it leaves in the business."
            align="center"
          />
          <div className="feature-grid">
            {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
          </div>
          <div className="section-link-wrap">
            <Link href="/features" className="text-link">Explore the complete feature map <ArrowRightIcon /></Link>
          </div>
        </div>
      </section>

      <section className="section workflow-section" aria-labelledby="workflow-title">
        <div className="shell workflow-layout">
          <div className="workflow-copy">
            <SectionHeading
              eyebrow="A clearer operating rhythm"
              title={<span id="workflow-title">From setup to a settled schedule in three steps.</span>}
              description="ServiceFlow turns a complicated operational loop into a short, legible path for the business and its clients."
            />
            <ol className="workflow-steps">
              <li>
                <span>01</span>
                <div><h3>Shape the business</h3><p>Define services, team profiles, booking policies, and the weekly windows that make the business bookable.</p></div>
              </li>
              <li>
                <span>02</span>
                <div><h3>Share a simple booking path</h3><p>Clients choose what they need, who they need, and a real available time—with local time made explicit.</p></div>
              </li>
              <li>
                <span>03</span>
                <div><h3>Run the day from one view</h3><p>The team handles changes, keeps clients informed, and learns from the booking rhythm without switching tools.</p></div>
              </li>
            </ol>
          </div>
          <div className="workflow-visual" aria-label="Illustrative weekly scheduling board">
            <div className="workflow-window-bar"><span /><span /><span /></div>
            <div className="workflow-board-heading">
              <div><small>Weekly availability</small><strong>Team rhythm</strong></div>
              <span>Europe / London</span>
            </div>
            <div className="week-grid" aria-hidden="true">
              {[
                ["MON", "09:00", "14:30"],
                ["TUE", "10:30", "16:00"],
                ["WED", "09:00", "13:00"],
                ["THU", "11:00", "15:30"],
                ["FRI", "09:30", "12:00"],
              ].map(([day, first, second], index) => (
                <div key={day} className="week-column">
                  <span>{day}</span>
                  <i className={`week-slot week-slot-${index % 3}`}>{first}</i>
                  <i className={`week-slot week-slot-${(index + 1) % 3}`}>{second}</i>
                </div>
              ))}
            </div>
            <div className="workflow-availability"><span><ClockIcon /></span><p><strong>8 open slots</strong><small>Ready to share this week</small></p><i>Live</i></div>
          </div>
        </div>
      </section>

      <section className="section roles-section" aria-labelledby="roles-title">
        <div className="shell">
          <SectionHeading
            eyebrow="Made for every side of the appointment"
            title={<span id="roles-title">The right amount of control, for the right role.</span>}
            description="One system does not need to mean one experience. Each role gets the context and actions that help them move."
          />
          <div className="roles-list">
            {roles.map((role) => (
              <article className="role-card" key={role.number}>
                <span className="role-number">{role.number}</span>
                <div className="role-copy"><h3>{role.title}</h3><p>{role.description}</p></div>
                <ul>{role.points.map((point) => <li key={point}><CheckIcon />{point}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </main>
  );
}

