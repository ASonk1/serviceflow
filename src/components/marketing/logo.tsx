import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand-link ${inverse ? "brand-link-inverse" : ""}`}
      aria-label="ServiceFlow home"
    >
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>ServiceFlow</span>
    </Link>
  );
}

