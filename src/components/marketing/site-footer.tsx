import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-main">
          <div className="footer-intro">
            <Logo inverse />
            <p>
              A calmer operating system for appointment-based work, designed as
              a production-minded portfolio demonstration.
            </p>
          </div>
          <div className="footer-links">
            <div>
              <p className="footer-heading">Product</p>
              {siteConfig.navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div>
              <p className="footer-heading">Project</p>
              {siteConfig.legal.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="footer-cta">
            <p className="footer-heading">See the product direction</p>
            <p>Walk through the static role and workflow preview.</p>
            <Link href="/demo" className="footer-action">
              Open the demo <ArrowRightIcon />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} ServiceFlow.</p>
          <p>Portfolio demonstration · No live booking or payments</p>
        </div>
      </div>
    </footer>
  );
}

