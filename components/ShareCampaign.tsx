"use client";
import { useState } from "react";
import { CAMPAIGN_FLYER, CAMPAIGN_SHARE_MESSAGE, CAMPAIGN_URL } from "@/lib/campaignShare";

export default function ShareCampaign() {
  const [message, setMessage] = useState("");
  async function copy(text: string, label: string) {
    try { await navigator.clipboard.writeText(text); setMessage(`${label} copied.`); }
    catch { setMessage("Copy the campaign message or link below using your device."); }
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "Gift & Glam Virtual Angel Tree", text: CAMPAIGN_SHARE_MESSAGE });
      else await copy(CAMPAIGN_SHARE_MESSAGE, "Campaign message");
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setMessage("Use Copy message or Download flyer to share instead."); }
  }
  return <section className="panel campaign-share no-print" aria-label="Share the joy">
    <div className="share-preview"><a href={CAMPAIGN_FLYER} download="GiftAndGlam2026.png"><img src={CAMPAIGN_FLYER} alt="Festive Gift & Glam campaign flyer with QR codes for the public angel tree and donations" width={1080} height={1350} loading="lazy"/></a></div>
    <div><h2>Share the Joy</h2><p>Invite friends and family to make Christmas brighter for another angel.</p>
      <p className="share-message">{CAMPAIGN_SHARE_MESSAGE}</p>
      <div className="acts"><button className="btn green" onClick={share}>Share the campaign</button><button className="btn ghost sm" onClick={()=>copy(CAMPAIGN_URL,"Public campaign link")}>Copy link</button><button className="btn ghost sm" onClick={()=>copy(CAMPAIGN_SHARE_MESSAGE,"Campaign message")}>Copy message</button><a className="btn gold sm" href={CAMPAIGN_FLYER} download="GiftAndGlam2026.png">Download QR flyer</a></div>
      <p className="muted" style={{marginTop:10,fontSize:".82rem"}}>The flyer links to the public tree and Donations page.</p><p role="status" className="muted">{message}</p>
    </div>
  </section>;
}
