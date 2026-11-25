"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { id: string; name: string; email: string; phone: string | null; shownName: string; fromDonation: boolean };

/** The Sponsor and Contact cells of a sponsorship row, with inline editing. */
export default function SponsorCells({ id, name, email, phone, shownName, fromDonation }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: fromDonation ? shownName : name, email, phone: phone || "" });

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/sponsor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, name: form.name, email: form.email, phone: form.phone || null }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't save.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <>
        <td>
          <b>{shownName}</b>
          {fromDonation && <div className="muted" style={{ fontSize: ".74rem" }}>Name from their donation</div>}
          <div><button type="button" className="item-add" onClick={() => setEditing(true)}>Edit</button></div>
        </td>
        <td>{phone || ""}<br />{email}</td>
      </>
    );
  }
  return (
    <td colSpan={2}>
      <div className="two" style={{ gap: 8 }}>
        <label className="field"><span className="lbl">Name</span><input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} /></label>
        <label className="field"><span className="lbl">Email</span><input type="email" value={form.email} maxLength={200} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={busy} /></label>
        <label className="field"><span className="lbl">Phone (optional)</span><input type="tel" value={form.phone} maxLength={40} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={busy} /></label>
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="acts" style={{ marginTop: 6 }}>
        <button type="button" className="btn sm" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => { setEditing(false); setErr(""); }}>Cancel</button>
      </div>
    </td>
  );
}
