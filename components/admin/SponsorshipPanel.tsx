"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Status } from "@/lib/types";

type Gift = "none" | "pledged" | "received";
type Sponsor = { name: string; email: string; phone: string | null; adopted: string | null } | null;

const STEPS: { status: Exclude<Status, "available">; title: string; detail: string }[] = [
  { status: "claimed", title: "Sponsored", detail: "A sponsor has adopted this angel." },
  { status: "purchased", title: "Shopping complete", detail: "The sponsor says they are done shopping." },
  { status: "returned", title: "Gifts returned", detail: "You checked the gifts in at drop-off (due Dec 10)." },
  { status: "given", title: "Given out", detail: "Handed to the family at the giveaway (Dec 12)." },
];
const ORDER: Status[] = ["available", "claimed", "purchased", "returned", "given"];
const LABEL: Record<Status, string> = { available: "Available", claimed: "Sponsored", purchased: "Shopping complete", returned: "Gifts returned", given: "Given out" };

/** Sponsorship and gift progress as switches. Turning a step on turns on the steps before it; turning it off turns off the steps after it. */
export default function SponsorshipPanel({ id, status, gift, sponsor }: { id: string; status: Status; gift: Gift; sponsor: Sponsor }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const level = ORDER.indexOf(status);

  async function post(body: unknown) {
    setBusy(true);
    setErr("");
    setNote("");
    try {
      const res = await fetch("/api/admin/child", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't save.");
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const flipStep = (i: number) => {
    const on = level >= i + 1;
    // Turning a step off goes back to the step before it (or Available, which also releases the sponsor).
    void post({ action: "status", id, status: on ? ORDER[i] : ORDER[i + 1] });
  };
  const setGift = (value: Gift) => void post({ action: "gift", id, value });

  async function clearAll() {
    if (await post({ action: "clear_all", id })) {
      setConfirm(false);
      setNote("Cleared. Status is Available, no sponsor, gift cards off. The tree setting was not changed.");
    }
  }

  const Switch = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch${on ? " on" : ""}`} disabled={busy} onClick={onClick}><i aria-hidden="true" /></button>
  );

  return (
    <div className="panel sponsorship-panel" aria-labelledby="sg-title">
      <h3 id="sg-title" style={{ marginBottom: 4 }}>Sponsorship and gifts</h3>
      <p className="muted" style={{ marginBottom: 8 }}>Status: <span className={`pill ${status}`}>{LABEL[status]}</span></p>
      {sponsor ? (
        <div className="sponsor-box"><b>{sponsor.name}</b><span>{sponsor.email}</span><span>{sponsor.phone || "No phone"}</span>{sponsor.adopted && <span className="muted">Adopted {sponsor.adopted}</span>}</div>
      ) : (
        <div className="sponsor-box"><b>No sponsor yet</b><span className="muted">Sponsors adopt on the public tree. You can also turn on Sponsored yourself.</span></div>
      )}
      <ul className="step-list">
        {STEPS.map((s, i) => (
          <li key={s.status} className="step-row">
            <Switch on={level >= i + 1} label={s.title} onClick={() => flipStep(i)} />
            <div><div className="step-title">{s.title}</div><div className="step-detail">{s.detail}</div></div>
          </li>
        ))}
      </ul>
      <h4 className="step-group">Gift cards (optional)</h4>
      <ul className="step-list">
        <li className="step-row">
          <Switch on={gift !== "none"} label="Gift card pledged" onClick={() => setGift(gift === "none" ? "pledged" : "none")} />
          <div><div className="step-title">Gift card pledged</div><div className="step-detail">The sponsor promised a gift card.</div></div>
        </li>
        <li className="step-row">
          <Switch on={gift === "received"} label="Gift card received" onClick={() => setGift(gift === "received" ? "pledged" : "received")} />
          <div><div className="step-title">Gift card received</div><div className="step-detail">You have the card in hand.</div></div>
        </li>
      </ul>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="step-clear">
        <h4 className="step-group">Start over</h4>
        {!confirm ? (
          <button type="button" className="btn ghost sm" disabled={busy} onClick={() => { setConfirm(true); setNote(""); }}>Clear all settings</button>
        ) : (
          <div className="err" role="alertdialog" aria-label="Confirm clear all" style={{ display: "grid", gap: 8 }}>
            <p><b>Reset this angel?</b> This removes the sponsor, turns every step and gift card off, and sets the status back to Available. The tree setting is left as it is. Gifts already received are not undone, so check first.</p>
            <div className="acts"><button type="button" className="btn sm" disabled={busy} onClick={clearAll}>Yes, clear everything</button><button type="button" className="btn ghost sm" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></div>
          </div>
        )}
        {note && <p className="ok" role="status" style={{ marginTop: 8 }}>{note}</p>}
      </div>
      <p className="muted" style={{ fontSize: ".78rem", marginTop: 10 }}>Given out means the gifts were handed to the family at the giveaway.</p>
    </div>
  );
}
