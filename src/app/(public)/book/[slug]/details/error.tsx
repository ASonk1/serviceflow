"use client";
export default function Error({reset}:{reset:()=>void}){return <main id="main-content" className="booking-page"><section className="booking-shell"><div className="auth-message auth-message-error" role="alert">The booking details could not be loaded.</div><h1>Please try again</h1><button className="button button-ink" onClick={reset}>Retry</button></section></main>}
