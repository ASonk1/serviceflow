"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="mobile-navigation">
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <XIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <div id="mobile-menu" className="mobile-menu">
          <nav aria-label="Mobile navigation">
            {siteConfig.navigation.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <Link href="/privacy" onClick={() => setOpen(false)}>
              Privacy
            </Link>
          </nav>
          <Link
            href="/demo"
            className="button button-primary button-full"
            onClick={() => setOpen(false)}
          >
            Explore the demo
          </Link>
        </div>
      ) : null}
    </div>
  );
}

