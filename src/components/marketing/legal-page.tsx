import type { ReactNode } from "react";
import { PageHero } from "./page-hero";

export function LegalPage({
  eyebrow,
  title,
  description,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main id="main-content">
      <PageHero eyebrow={eyebrow} title={title} description={description} />
      <div className="shell legal-layout">
        <aside className="legal-aside">
          <p>Last updated</p>
          <strong>{updated}</strong>
          <span>Plain-language portfolio notice</span>
        </aside>
        <article className="legal-content">{children}</article>
      </div>
    </main>
  );
}

