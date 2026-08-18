import Link from "next/link";
import {ServiceForm} from "@/components/services/service-form";
import {getOwnerWorkspace} from "@/features/services/workspace";
export const metadata={title:"Create service"};
export default async function Page(){const {organization}=await getOwnerWorkspace();return <main id="main-content" className="dashboard-foundation service-management"><header className="service-page-header"><Link href="/dashboard/services" className="back-link">← Services</Link><p className="eyebrow">New service</p><h1>Create a service</h1><p>Prices use {organization.currency}. Scheduling uses {organization.timezone}.</p></header><section className="service-editor-card"><ServiceForm organizationId={organization.id} currency={organization.currency}/></section></main>}
