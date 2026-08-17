"use client";
/* eslint-disable @next/next/no-img-element -- validated Supabase bucket URLs are runtime tenant data and need an error fallback. */
import {useState} from "react";
import {initials} from "@/features/media/validation";
export function PublicMediaImage({src,alt,name,className="generated-avatar"}:{src:string|null;alt:string;name:string;className?:string}){const [failed,setFailed]=useState(false);return src&&!failed?<img className={className} src={src} alt={alt} onError={()=>setFailed(true)}/>:<span className={className} data-testid="media-fallback" aria-label={`${name} initials`}>{initials(name)}</span>}
