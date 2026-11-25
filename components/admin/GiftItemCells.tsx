"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { giftLabel, GIFT_KIND, type GiftItem, type AdminGiftEdit, type GiftSource } from "@/lib/giftItems";

export function useGiftEdit() {
  const router = useRouter();
  const [pending, startRefresh] = useTransition();
  const [saving, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const action=async(edit:AdminGiftEdit)=>{setErr("");setBusy(true);try{const res=await fetch("/api/admin/gifts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(edit)});if(!res.ok)setErr((await res.json().catch(()=>({}))).error||"Nothing saved. Try again.");else startRefresh(() => router.refresh());}catch{setErr("Could not connect. Try again.");}finally{setBusy(false)}};
  return { action, busy: saving || pending, err };
}

export function GiftItemCells({item:g,busy,action}:{item:GiftItem;busy:boolean;action:(edit:AdminGiftEdit)=>void}){return <><td>{giftLabel(g)}{!g.active&&<small className="muted"> (removed from request)</small>}</td><td>{GIFT_KIND[g.kind]}</td><td><select aria-label={`Purchase status for ${g.label}`} disabled={busy||!g.active} value={g.purchase_source||""} onChange={e=>action({itemId:g.id,action:"purchase",source:(e.target.value||null) as GiftSource|null})}><option value="">Not purchased</option><option value="sponsor">Sponsor purchased</option><option value="organizer">Organizer purchased</option><option value="donation">Donation purchased</option></select></td><td><label><input type="checkbox" checked={g.received} disabled={busy||!g.active} onChange={e=>action({itemId:g.id,action:"received",value:e.target.checked})}/> Received</label></td><td><label><input type="checkbox" checked={g.donation_assigned} disabled={busy||!g.active} onChange={e=>action({itemId:g.id,action:"donation",value:e.target.checked})}/> Donation assigned</label></td></>}
