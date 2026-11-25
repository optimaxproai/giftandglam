"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {DRIVE} from "@/lib/drive";
import type {PublicChild} from "@/lib/types";

export default function ClaimForm({child,hasSponsorSession=false,onUnavailable}:{child:PublicChild;hasSponsorSession?:boolean;onUnavailable?:()=>void}){
  const router=useRouter();const [busy,setBusy]=useState(false),[err,setErr]=useState(""),[helpRecover,setHelpRecover]=useState(false),[reuse,setReuse]=useState(hasSponsorSession);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);setErr("");setHelpRecover(false);setBusy(true);
    try{const res=await fetch("/api/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({childId:child.id,reuseSponsor:reuse,...(!reuse?{name:f.get("name"),email:f.get("email"),phone:f.get("phone")}:{ }),gift:f.get("gift")==="on",website:f.get("website")})});const j=await res.json().catch(()=>({}));
      if (res.status === 409 && j.code === "unavailable") {
        setBusy(false);
        if (onUnavailable) onUnavailable();
        else setErr("This angel is no longer available. Please choose another angel.");
        router.refresh();
        return;
      }
      if(!res.ok){setErr(j.error||"Something went wrong. Please try again.");setHelpRecover(j.code==="session");setBusy(false);return;}
      if(j.alreadyAdopted&&typeof j.token==="string"&&/^[a-z0-9]{8,80}$/.test(j.token)){router.replace(`/mine/${j.token}?already=1`);return;}
      if(typeof j.token!=="string"||! /^[a-z0-9]{8,80}$/.test(j.token)){setErr("We could not confirm this adoption. Please contact the organizer.");setBusy(false);return;}
      router.replace(`/mine/${j.token}/thank-you?angel=${encodeURIComponent(child.code)}&mail=${encodeURIComponent(j.emailStatus||"unavailable")}`);
    }catch{setErr("We couldn't reach the tree. Check your connection and try again.");setBusy(false)}
  }
  return <form onSubmit={submit}><p className="muted" style={{marginBottom:12}}>{DRIVE.giftSuggestion}</p>
    {hasSponsorSession&&<label className="check"><input type="checkbox" checked={reuse} disabled={busy} onChange={e=>setReuse(e.target.checked)}/><span>Use my existing sponsor contact information</span></label>}
    {!reuse && <>
      <div className="field">
        <label htmlFor="cl-email">Email (required)</label>
        <input id="cl-email" name="email" type="email" autoComplete="email" required maxLength={200} aria-describedby="claim-email-help"/>
        <small id="claim-email-help">We use your email to send your confirmation, private My Angels link, and gift drop-off reminders. It stays private from families and other sponsors. Leave your name and phone blank to sponsor anonymously.</small>
      </div>
      <div className="field"><label htmlFor="cl-name">Your name (optional)</label><input id="cl-name" name="name" autoComplete="name" maxLength={120}/></div>
      <div className="field"><label htmlFor="cl-phone">Phone (optional)</label><input id="cl-phone" name="phone" type="tel" autoComplete="tel" maxLength={40}/></div>
    </> }
    <input name="website" tabIndex={-1} autoComplete="off" style={{position:"absolute",left:"-9999px"}} aria-hidden="true"/>
    {child.gifts.length>0&&<label className="check"><input type="checkbox" name="gift"/><span>I will also purchase the optional gift cards listed above (total ${child.gifts.reduce((sum,g)=>sum+g.amount,0)}).</span></label>}
    <p className="muted">Please return gifts unwrapped by {DRIVE.returnByLabel}.</p>{err&&<div className="err" role="alert">{err}{helpRecover&&<> <Link href="/mine">Recover your private My Angels link.</Link></>}</div>}
    <button className="btn" type="submit" disabled={busy}>{busy?"Adopting…":`Confirm adoption of ${child.code}`}</button>
  </form>;
}
