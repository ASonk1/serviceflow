import type { ReactNode } from "react"; import { requireDestination } from "@/lib/authz/guards";
export default async function Layout({ children }: { children: ReactNode }) { await requireDestination("/dashboard", "/dashboard"); return children; }
