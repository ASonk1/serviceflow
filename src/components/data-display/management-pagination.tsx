import Link from "next/link";
import {pageCount} from "@/features/lists/query";

export function ManagementPagination({page,pageSize,total,previousHref,nextHref}:{page:number;pageSize:number;total:number;previousHref:string;nextHref:string}){
 const pages=pageCount(total,pageSize);const start=total===0?0:(page-1)*pageSize+1;const end=Math.min(page*pageSize,total);
 return <nav className="management-pagination" aria-label="List pagination"><p aria-live="polite">Showing {start}–{end} of {total}</p><div>{page>1?<Link className="button onboarding-secondary" href={previousHref} rel="prev">Previous</Link>:<span aria-disabled="true">Previous</span>}<span>Page {page} of {pages}</span>{page<pages?<Link className="button onboarding-secondary" href={nextHref} rel="next">Next</Link>:<span aria-disabled="true">Next</span>}</div></nav>
}
