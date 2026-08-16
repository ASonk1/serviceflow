import type { ReactNode } from "react";

export function FeatureCard({
  icon,
  title,
  description,
  detail,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  detail?: string;
}) {
  return (
    <article className="feature-card">
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {detail ? <span className="feature-detail">{detail}</span> : null}
    </article>
  );
}

