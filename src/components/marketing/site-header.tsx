import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";
import { Logo } from "./logo";
import { MobileNavigation } from "./mobile-navigation";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Logo />
        <nav className="desktop-navigation" aria-label="Primary navigation">
          {siteConfig.navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="desktop-header-action">
          <Link href="/demo" className="button button-ink button-small">
            Explore demo
            <ArrowRightIcon />
          </Link>
        </div>
        <MobileNavigation />
      </div>
    </header>
  );
}

