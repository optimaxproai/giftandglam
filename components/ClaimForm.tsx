"use client";
import Link from "next/link";
import { useState } from "react";
import { DRIVE } from "@/lib/drive";
import type { GiftCard } from "@/lib/giftCards";
import Celebration from "./Celebration";
import type { PublicChild } from "@/lib/types";

export default function ClaimForm({ childId, name, gifts, child, dropOff,onClaim }: { childId: string; name: string; gifts: GiftCard[]; child: PublicChild; dropOff: string; onClaim?:()=>void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");
  const [emailStatus,setEmailStatus]=useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          childId,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          gift: f.get("gift") === "on",
          website: f.get("website"),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || "Something went wrong. Please try again.");
      else { setToken(j.token);setEmailStatus(j.emailStatus||"unavailable");onClaim?.(); }
    } catch {
      setErr("We couldn't reach the tree. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (token)
    return (
      <div>
        <Celebration mode="confetti"/>
        <h2 style={{color:"var(--pine)",fontSize:"2rem"}}>Thank you for making Christmas brighter!</h2>
        <div className="ok"><b>You are sponsoring {name}.</b> {emailStatus==="sent"?"A confirmation email with your angel’s list and private link was accepted for sending.":emailStatus==="demo"?"This preview does not send email.":"We couldn't send the confirmation email. Save your private link below and contact the organizer if needed."}</div>
        <div className="fact"><small>Your angel code</small><b>{child.code}</b></div>
        <h3 style={{marginBlock:12}}>Everything you need to do</h3><ul className="list"><li>{DRIVE.giftSuggestion}</li><li>Open My Angels to check off each individual gift purchased and select Done shopping.</li><li>Return all gifts unwrapped by {DRIVE.returnByLabel}, labelled {child.code}.</li><li style={{whiteSpace:"pre-line"}}>{dropOff}</li><li>Giveaway: {DRIVE.giveawayLabel}.</li><li>If your plans change, <a href="mailto:paradigmgiftdrive@gmail.com">contact the organizer</a>.</li></ul>
        <p style={{ margin: "10px 0" }}>Save your private link. My Angels includes your shopping checklist, downloadable list and printable gift bag label.</p>
        <Link className="btn" href={`/mine/${token}`}>Open My Angels</Link>
        <p className="muted" style={{marginTop:10}}>Lost the link later? Use your angel code and email on <Link href="/mine">My Angels</Link>.</p>
      </div>
    );

  return (
    <form onSubmit={submit}>
      <p className="muted" style={{ marginBottom: 12 }}>{DRIVE.giftSuggestion}</p>
      <div className="field"><label htmlFor="cl-name">Your name</label><input id="cl-name" name="name" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="cl-email">Email</label><input id="cl-email" name="email" type="email" autoComplete="email" required /><small>Used for drop-off instructions and reminders. Never shown to other sponsors.</small></div>
      <div className="field"><label htmlFor="cl-phone">Phone (optional)</label><input id="cl-phone" name="phone" type="tel" autoComplete="tel" /></div>
      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      {gifts.length > 0 && (
        <label className="check"><input type="checkbox" name="gift" /><span>I will also purchase the optional gift cards listed above (total ${gifts.reduce((sum, gift) => sum + gift.amount, 0)}).</span></label>
      )}
      <label className="check"><input type="checkbox" required /><span>I will return the gifts unwrapped by {DRIVE.returnByLabel}.</span></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Adopting…" : `Adopt ${name}`}</button>
    </form>
  );
}
