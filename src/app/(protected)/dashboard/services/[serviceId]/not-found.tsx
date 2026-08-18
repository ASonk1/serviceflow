import Link from "next/link";
export default function NotFound(){return <main id="main-content" className="dashboard-foundation service-management"><p className="eyebrow">Safe service lookup</p><h1>Service not found</h1><p>This service does not exist or is not available in your organization.</p><Link className="button button-primary" href="/dashboard/services">Return to services</Link></main>}
