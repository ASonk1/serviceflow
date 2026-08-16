import Link from "next/link";
import { ArrowRightIcon, SparklesIcon } from "@/components/ui/icons";

export function FinalCta() {
  return (
    <section className="final-cta-section" aria-labelledby="final-cta-title">
      <div className="shell">
        <div className="final-cta">
          <div className="final-cta-glow" aria-hidden="true" />
          <div>
            <p className="eyebrow eyebrow-light"><SparklesIcon /> Portfolio build</p>
            <h2 id="final-cta-title">A thoughtful foundation for the work between appointments.</h2>
            <p>
              Explore the static product concept today. Booking, authentication,
              and payments arrive in later, security-gated phases.
            </p>
          </div>
          <div className="final-cta-actions">
            <Link href="/demo" className="button button-light">
              Explore the demo <ArrowRightIcon />
            </Link>
            <Link href="/features" className="button button-ghost-light">
              Browse features
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

