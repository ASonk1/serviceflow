import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {BusinessProfile} from "@/components/onboarding/business-profile";
import {getPublicBusiness} from "@/features/onboarding/public-business";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const business=await getPublicBusiness((await params).slug);if(!business)return{title:"Business not found",robots:{index:false,follow:false}};return{title:`${business.name} | Book with ServiceFlow`,description:`View services and weekly availability for ${business.name}.`}}
export default async function Page({params}:Props){const business=await getPublicBusiness((await params).slug);if(!business)notFound();return <BusinessProfile business={business}/>}
