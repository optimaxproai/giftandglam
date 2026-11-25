"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** The one maximum-age rule for the season. Open children and age-based set-asides move to match. */
export default function SettingsBar({ maxAge, confirmed }: { maxAge: number; confirmed: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(String(maxAge));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/household", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save_max_age", maxAge: Number(v) }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, t: j.error || "That didn't save." });
    setMsg({ ok: true, t: j.moved ? `Saved. ${j.moved} ${j.moved === 1 ? "child was" : "children were"} re-checked against the new limit.` : "Saved." });
    router.refresh();
  }

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="acts" style={{ alignItems: "end" }}>
        <div className="field" style={{ margin: 0 }}>
          <label className="lbl" htmlFor="maxage">Maximum age this season</label>
          <input id="maxage" inputMode="numeric" style={{ width: 100 }} value={v} onChange={(e) => setV(e.target.value)} />
        </div>
        <button className="btn sm" onClick={save} disabled={busy || v.trim() === "" || (confirmed && Number(v) === maxAge)}>{confirmed ? "Change limit" : "Confirm limit"}</button>
        <span className={`pill ${confirmed ? "available" : "late"}`}>{confirmed ? `Limit confirmed: ${maxAge}` : `Starting limit ${maxAge}: please confirm`}</span>
      </div>
      <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>Children over the limit are set aside with a reason. A family whose only applicant is over the limit leaves the review queue; eligible siblings stay in it. Approved and published angels are never moved.</p>
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </div>
  );
}
