"use client";
import Link from "next/link";
export default function Error({retry}:{error:Error;retry:()=>void}){return <main id="main-content" className="booking-page"><section className="booking-shell"><h1>Availability could not be loaded</h1><p>This may be temporary. Try again or return to the service list.</p><div className="not-found-actions"><button className="button button-ink" onClick={()=>retry()}>Try again</button><Link className="button button-outline" href="/">Return home</Link></div></section></main>}
