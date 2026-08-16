export default function MarketingLoading() {
  return (
    <main id="main-content" className="loading-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <section className="loading-hero">
        <div className="shell">
          <div className="skeleton skeleton-label" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-title skeleton-title-short" />
          <div className="skeleton skeleton-copy" />
        </div>
      </section>
      <section className="shell loading-cards" aria-hidden="true">
        <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
      </section>
    </main>
  );
}

