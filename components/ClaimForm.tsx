"use client";
import Link from "next/link";
import { useState } from "react";
import { DRIVE } from "@/lib/drive";

export default function ClaimForm({ childId, name, gift }: { childId: string; name: string; gift: { store: string; amount: number } | null }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [token, setToken] = useState("");

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
      else setToken(j.token);
    } catch {
      setErr("We couldn't reach the tree. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (token)
    return (
      <div>
        <div className="ok"><b>Thank you!</b> You are sponsoring {name}.</div>
        <p style={{ margin: "10px 0" }}>Save this link. It is your list of angels, with {name}&apos;s wish list and the return date ({DRIVE.returnByLabel}).</p>
        <Link className="btn" href={`/mine/${token}`}>Open my angels</Link>
      </div>
    );

  return (
    <form onSubmit={submit}>
      <p className="muted" style={{ marginBottom: 12 }}>{DRIVE.giftSuggestion}</p>
      <div className="field"><label htmlFor="cl-name">Your name</label><input id="cl-name" name="name" autoComplete="name" required /></div>
      <div className="field"><label htmlFor="cl-email">Email</label><input id="cl-email" name="email" type="email" autoComplete="email" required /><small>Used for drop-off instructions and reminders. Never shown to other sponsors.</small></div>
      <div className="field"><label htmlFor="cl-phone">Phone (optional)</label><input id="cl-phone" name="phone" type="tel" autoComplete="tel" /></div>
      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      {gift && (
        <label className="check"><input type="checkbox" name="gift" /><span>I will also cover the ${gift.amount} {gift.store} gift card extra.</span></label>
      )}
      <label className="check"><input type="checkbox" required /><span>I will return the gifts unwrapped by {DRIVE.returnByLabel}.</span></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Adopting…" : `Adopt ${name}`}</button>
    </form>
  );
}
