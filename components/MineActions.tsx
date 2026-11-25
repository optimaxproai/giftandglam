"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {DONATIONS} from "@/lib/donations";

export default function MineActions({token,childId,status}:{token:string;childId:string;status:string}){
  const router=useRouter();const [err,setErr]=useState(""),[busy,setBusy]=useState(false);
  async function complete(){setBusy(true);setErr("");try{const r=await fetch("/api/mine",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,childId,action:"bought"})});if(r.ok)router.refresh();else setErr((await r.json().catch(()=>({}))).error||"That didn't save. Please try again.")}catch{setErr("Could not connect. Try again.")}finally{setBusy(false)}}
  if(status!=="claimed"&&status!=="purchased")return null;
  return <div><div className="acts" style={{justifyContent:"center"}}>{status==="claimed"?<button className="btn sm green" disabled={busy} onClick={complete}>Done shopping</button>:<span className="pill available">Shopping complete</span>}<a className="btn sm ghost" href={`mailto:${DONATIONS.organizerEmail}?subject=Gift%20%26%20Glam%20sponsorship`}>Contact the Organizer</a></div><p className="muted" style={{fontSize:".8rem",marginTop:8}}>Done shopping keeps unchecked items outstanding. Contact the organizer if your sponsorship plans change.</p>{err&&<p className="err" role="alert">{err}</p>}</div>;
}
