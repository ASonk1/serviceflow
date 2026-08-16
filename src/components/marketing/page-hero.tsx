import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-grid" aria-hidden="true" />
      <div className="shell page-hero-inner">
        <p className="eyebrow eyebrow-light">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        {children ? <div className="page-hero-actions">{children}</div> : null}
      </div>
    </section>
  );
}

