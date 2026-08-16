import Link from "next/link";
import { Logo } from "@/components/marketing/logo";
import { ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-grid" aria-hidden="true" />
      <div className="not-found-header"><Logo inverse /></div>
      <div className="not-found-content">
        <div className="not-found-visual" aria-hidden="true">
          <span className="not-found-code">404</span>
          <div className="lost-slot"><CalendarIcon /><span><strong>No slot here</strong><small>This page left the schedule.</small></span></div>
        </div>
        <p className="eyebrow eyebrow-light">Page not found</p>
        <h1>This page slipped off the schedule.</h1>
        <p>The link may be outdated, or the page may have moved. Let’s get you back to a useful part of the flow.</p>
        <div className="not-found-actions">
          <Link href="/" className="button button-light">Return home <ArrowRightIcon /></Link>
          <Link href="/demo" className="button button-ghost-light">Explore demo</Link>
        </div>
      </div>
    </main>
  );
}

