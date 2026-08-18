import Link from "next/link";
export default function NotFound() { return <main className="dashboard-foundation"><section className="service-empty"><h1>Team member not found</h1><p>This member is unavailable or belongs to another organization.</p><Link className="button button-primary" href="/dashboard/team">Return to team</Link></section></main>; }

