"use client";
export default function Error({ reset }: { reset: () => void }) { return <main className="dashboard-foundation"><section className="service-empty"><h1>Team information is unavailable</h1><p>Nothing was changed. Try loading the team area again.</p><button className="button button-primary" onClick={reset}>Try again</button></section></main>; }

