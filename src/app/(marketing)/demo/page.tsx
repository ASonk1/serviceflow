import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";
import { ProductPreview } from "@/components/marketing/product-preview";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ArrowRightIcon, CalendarIcon, ChartIcon, CheckIcon, TeamIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Product Demo",
  description:
    "Tour the static ServiceFlow product concept for owners, staff, and clients. No live accounts, bookings, or payments are enabled yet.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Tour the ServiceFlow product concept",
    description: "A static, production-minded interface tour for owners, staff, and clients.",
    url: "/demo",
    type: "website",
  },
};

export default function DemoPage() {
  return (
    <main id="main-content">
      <PageHero
        eyebrow="Static product tour · Phase 1"
        title={<>See the operating day <span className="gradient-text">come into focus.</span></>}
        description="This portfolio demonstration shows the intended interface and information hierarchy. It does not create accounts, store data, book appointments, or process payments."
      >
        <Link href="#tour" className="button button-light">Start the tour <ArrowRightIcon /></Link>
        <Link href="/features" className="button button-ghost-light">View feature map</Link>
      </PageHero>

      <section className="section demo-stage-section" id="tour" aria-labelledby="demo-stage-title">
        <div className="shell">
          <div className="demo-stage-heading">
            <div><p className="eyebrow">Owner workspace</p><h2 id="demo-stage-title">The day, the signals, and the next decision.</h2></div>
            <p>Illustrative data only. Names and figures are fictional interface content, not customer results.</p>
          </div>
          <div className="demo-stage"><ProductPreview /></div>
        </div>
      </section>

      <section className="section demo-roles-section" aria-labelledby="demo-roles-title">
        <div className="shell">
          <SectionHeading
            eyebrow="Three perspectives"
            title={<span id="demo-roles-title">One appointment, viewed through the context each person needs.</span>}
            description="These static panels preview the role model without simulating authentication or exposing non-functional controls."
            align="center"
          />
          <div className="demo-role-grid">
            <article className="demo-role-card demo-role-owner">
              <div className="demo-card-top"><span><ChartIcon /></span><div><small>Owner view</small><h3>Business pulse</h3></div></div>
              <div className="demo-metric-row"><div><small>Appointments</small><strong>26</strong></div><div><small>Open slots</small><strong>8</strong></div></div>
              <div className="demo-sparkline" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
              <p>Understand the schedule and operational signals across the organization.</p>
            </article>
            <article className="demo-role-card">
              <div className="demo-card-top"><span><TeamIcon /></span><div><small>Staff view</small><h3>My next session</h3></div></div>
              <div className="demo-appointment-card"><time>11:30</time><div><strong>Progress review</strong><small>45 min · Studio 2</small></div><span>Confirmed</span></div>
              <ul className="demo-check-list"><li><CheckIcon /> Assigned schedule only</li><li><CheckIcon /> Personal availability</li></ul>
              <p>A quiet, action-oriented view without organization-wide admin noise.</p>
            </article>
            <article className="demo-role-card">
              <div className="demo-card-top"><span><CalendarIcon /></span><div><small>Client view</small><h3>Choose a time</h3></div></div>
              <div className="demo-date-row" aria-hidden="true"><span>MON<small>17</small></span><span className="selected">TUE<small>18</small></span><span>WED<small>19</small></span><span>THU<small>20</small></span></div>
              <div className="demo-times" aria-hidden="true"><span>09:00</span><span className="selected">11:30</span><span>14:00</span></div>
              <p>Mobile-first steps make the local date, time, and selection unmistakable.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section demo-boundary-section" aria-labelledby="boundary-title">
        <div className="shell demo-boundary">
          <div><p className="eyebrow">Honest by design</p><h2 id="boundary-title">What this demonstration does—and does not—do.</h2></div>
          <div className="boundary-grid">
            <article><span>Included now</span><h3>Marketing and interface foundation</h3><p>Responsive public pages, product visual language, static role previews, metadata, and accessible navigation.</p></article>
            <article><span>Coming later</span><h3>Verified application behavior</h3><p>Authentication, tenant data, booking, Stripe test mode, email, audit history, and analytics each have their own roadmap gate.</p></article>
          </div>
        </div>
      </section>
    </main>
  );
}
