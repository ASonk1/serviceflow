"use client";
import Link from "next/link";
import {useActionState} from "react";
import {createNoPaymentBooking} from "./actions";
import type {BookingActionState} from "./booking";

type Props={hidden:{slug:string;serviceId:string;staff:string;date:string;startsAt:string;submissionKey:string;guestToken:string};policy:string;recoveryUrl:string};
const initial:BookingActionState={status:"idle"};
export function BookingForm({hidden,policy,recoveryUrl}:Props){const [state,action,pending]=useActionState(createNoPaymentBooking,initial);const error=(name:string)=>state.errors?.[name]?.[0];return <form action={action} className="booking-contact-form" noValidate aria-busy={pending}>
  {Object.entries(hidden).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
  {state.message?<div className="auth-message auth-message-error" role="alert" tabIndex={-1}>{state.message}{state.errors?<ul className="form-error-list">{Object.entries(state.errors).flatMap(([field,messages])=>messages.map(message=><li key={`${field}-${message}`}>{message}</li>))}</ul>:null}{state.status==="slot-lost"?<p><Link href={recoveryUrl}>Return to refreshed availability</Link></p>:null}</div>:null}
  <div className="form-field"><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" autoComplete="name" required maxLength={120} defaultValue={state.fields?.fullName} aria-invalid={!!error("fullName")} aria-describedby={error("fullName")?"fullName-error":undefined}/>{error("fullName")?<p id="fullName-error" className="field-error">{error("fullName")}</p>:null}</div>
  <div className="form-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={320} defaultValue={state.fields?.email} aria-invalid={!!error("email")} aria-describedby={error("email")?"email-error":undefined}/>{error("email")?<p id="email-error" className="field-error">{error("email")}</p>:null}</div>
  <div className="form-field"><label htmlFor="phone">Phone <span>(optional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={32} defaultValue={state.fields?.phone} aria-invalid={!!error("phone")} aria-describedby={error("phone")?"phone-error":undefined}/>{error("phone")?<p id="phone-error" className="field-error">{error("phone")}</p>:null}</div>
  <label className="checkbox-field"><input name="policyAccepted" type="checkbox" required aria-invalid={!!error("policyAccepted")}/><span><strong>I accept the booking policy</strong><small>{policy}</small>{error("policyAccepted")?<span className="field-error">{error("policyAccepted")}</span>:null}</span></label>
  <button className="button button-ink button-full" disabled={pending} type="submit">{pending?"Confirming appointment…":"Confirm appointment"}</button>
  <p className="booking-fine-print">No payment is collected. The server checks the selected time again before confirming.</p>
  </form>}
