"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type PChild = {
  id: string; name: string; code: string | null; age: number | null; ageUnsure: boolean; ageFlag: "missing" | "uncertain" | "over_age" | null;
  gender: string | null; decision: string; decisionLabel: string; pill: string; reason: string | null; published: boolean;
  wants: string[]; needs: string[]; sizes: string; status: string;
};
export type PFamily = { id: string; parentName: string; phone: string; email: string; story: string };

const FLAG: Record<string, string> = { missing: "Age missing", uncertain: "Age unclear", over_age: "Over the age limit" };

async function post(body: unknown): Promise<{ ok: boolean; error?: string; published?: number }> {
  const res = await fetch("/api/admin/household", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, ...j } : { ok: false, error: j.error || "That didn't save." };
}

export default function HouseholdPanel({ family, kids, maxAge }: { family: PFamily; kids: PChild[]; maxAge: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; t: string; child?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [ageIn, setAgeIn] = useState<Record<string, string>>(() => Object.fromEntries(kids.map((k) => [k.id, k.age == null ? "" : String(k.age)])));
  const [fam, setFam] = useState(family);

  async function run(body: unknown, ok: string, child?: string) {
    setBusy(true);
    setMsg(null);
    const r = await post(body);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: r.error!, child });
    setMsg({ ok: true, t: ok, child });
    router.refresh();
  }

  const approvedUnpublished = kids.filter((k) => k.decision === "approved" && !k.published).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel private">
        <h3 style={{ marginBottom: 10 }}>Household</h3>
        <div className="three aligned-fields">
          <div className="field"><label className="lbl" htmlFor="fp">Parent or guardian</label><input id="fp" value={fam.parentName} onChange={(e) => setFam({ ...fam, parentName: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="fph">Phone</label><input id="fph" value={fam.phone} onChange={(e) => setFam({ ...fam, phone: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="fe">Email</label><input id="fe" value={fam.email} onChange={(e) => setFam({ ...fam, email: e.target.value })} /></div>
        </div>
        <div className="field"><label className="lbl" htmlFor="fs">Story (private)</label><textarea id="fs" style={{ minHeight: 64 }} value={fam.story} onChange={(e) => setFam({ ...fam, story: e.target.value })} /></div>
        <button className="btn sm ghost" disabled={busy} onClick={() => run({ action: "update_household", familyId: fam.id, parentName: fam.parentName, phone: fam.phone, email: fam.email, story: fam.story }, "Household saved.")}>Save household</button>
      </div>

      {kids.map((k) => {
        const mine = msg?.child === k.id ? msg : null;
        const locked = k.published;
        return (
          <div className="panel" key={k.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <h3>{k.name} {k.code && <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: ".9rem" }}>· {k.code}</span>}</h3>
              <div className="chips">
                <span className={`pill ${k.pill}`}>{k.decisionLabel}</span>
                {k.published && <span className="pill available">On the tree</span>}
                {k.ageFlag && <span className="pill late">{FLAG[k.ageFlag]}</span>}
              </div>
            </div>
            <p className="muted" style={{ fontSize: ".88rem" }}>{k.gender || "Gender not stated"} · age {k.age ?? "not stated"} · {k.sizes || "no sizes"}</p>
            {k.reason && <p style={{ margin: "6px 0", fontSize: ".9rem" }}><b>Reason on record:</b> {k.reason}</p>}
            <div className="two" style={{ margin: "8px 0", fontSize: ".88rem" }}>
              <div><b>Wants</b><ul className="list">{k.wants.length ? k.wants.map((w) => <li key={w}>{w}</li>) : <li className="muted">None listed</li>}</ul></div>
              <div><b>Needs</b><ul className="list">{k.needs.length ? k.needs.map((w) => <li key={w}>{w}</li>) : <li className="muted">None listed</li>}</ul></div>
            </div>

            <div className="field" style={{ maxWidth: 360 }}>
              <label className="lbl" htmlFor={`age-${k.id}`}>Age</label>
              <div className="acts">
                <input id={`age-${k.id}`} style={{ width: 90 }} inputMode="numeric" value={ageIn[k.id]} onChange={(e) => setAgeIn({ ...ageIn, [k.id]: e.target.value })} disabled={locked} />
                <button className="btn sm ghost" disabled={busy || locked} onClick={() => run({ action: "set_age", childId: k.id, age: ageIn[k.id].trim() === "" ? null : Number(ageIn[k.id]) }, "Age saved. The season limit was checked.", k.id)}>Save age</button>
                {k.ageFlag === "uncertain" && <button className="btn sm green" disabled={busy} onClick={() => run({ action: "confirm_age", childId: k.id }, "Age confirmed.", k.id)}>Age is confirmed</button>}
              </div>
              <small>Season limit: {maxAge}. Saving an age over it sets the child aside.</small>
            </div>

            <div className="field">
              <label className="lbl" htmlFor={`why-${k.id}`}>Reason (required for more information, decline and set aside)</label>
              <input id={`why-${k.id}`} value={reason[k.id] || ""} onChange={(e) => setReason({ ...reason, [k.id]: e.target.value })} disabled={locked} />
            </div>
            <div className="acts">
              <Link className="btn sm ghost" href={`/admin/children/${k.id}`}>Edit child details</Link>
              <button className="btn sm green" disabled={busy || k.decision === "approved"} onClick={() => run({ action: "decide", childId: k.id, decision: "approved" }, "Approved. Not on the tree until you publish.", k.id)}>Approve</button>
              <button className="btn sm ghost" disabled={busy || locked} onClick={() => run({ action: "decide", childId: k.id, decision: "needs_info", reason: reason[k.id] }, "Marked as needing more information.", k.id)}>Request more information</button>
              <button className="btn sm ghost" disabled={busy || locked} onClick={() => run({ action: "decide", childId: k.id, decision: "declined", reason: reason[k.id] }, "Declined. It stays on record.", k.id)}>Decline</button>
              <button className="btn sm ghost" disabled={busy || locked} onClick={() => run({ action: "decide", childId: k.id, decision: "set_aside", reason: reason[k.id] }, "Set aside.", k.id)}>Set aside</button>
              {k.decision !== "pending" && k.decision !== "approved" && <button className="btn sm ghost" disabled={busy} onClick={() => run({ action: "decide", childId: k.id, decision: "pending" }, "Moved back to review.", k.id)}>Restore to review</button>}
              {k.decision === "approved" && (k.published
                ? <button className="btn sm ghost" disabled={busy} onClick={() => run({ action: "unpublish", childId: k.id }, `${k.code} removed from the tree.`, k.id)}>Unpublish</button>
                : <button className="btn sm gold" disabled={busy} onClick={() => run({ action: "publish", childId: k.id }, `${k.code} is on the tree.`, k.id)}>Publish to the tree</button>)}
            </div>
            {k.published && <p className="muted" style={{ fontSize: ".8rem", marginTop: 6 }}>Unpublish before changing the age or the decision.</p>}
            {mine && <div className={mine.ok ? "ok" : "err"} role="status" style={{ marginTop: 8 }}>{mine.t}</div>}
          </div>
        );
      })}
      {kids.length > 1 && approvedUnpublished > 1 && <div><button className="btn gold" disabled={busy} onClick={() => run({ action: "publish_all", familyId: fam.id }, "Every approved angel in this household is on the tree.")}>Publish all approved ({approvedUnpublished})</button></div>}
      {msg && !msg.child && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </div>
  );
}
