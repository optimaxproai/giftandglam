"use client";
import Link from "next/link";
import { useState } from "react";

type Kid = { key: string; name: string; age: string; unsure: boolean; gender: string; tops: string; bottoms: string; shoes: string; wants: string; needs: string; faves: string; giftStore: string };
let seq = 0;
const blank = (): Kid => ({ key: `k${++seq}`, name: "", age: "", unsure: false, gender: "", tops: "", bottoms: "", shoes: "", wants: "", needs: "", faves: "", giftStore: "" });
const lines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);

type Result = { familyId: string; merged: boolean; skipped: string[]; children: { id: string; name: string; decision: string; reason: string | null }[] };

/** Quick entry from a printed email: one household, then each child. The season's age limit is applied on save. */
export default function HouseholdForm({ maxAge, confirmed }: { maxAge: number; confirmed: boolean }) {
  const [parent, setParent] = useState({ name: "", phone: "", email: "", story: "" });
  const [kids, setKids] = useState<Kid[]>([blank()]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Result | null>(null);
  const setKid = (k: string, p: Partial<Kid>) => setKids((a) => a.map((x) => (x.key === k ? { ...x, ...p } : x)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!parent.name.trim()) return setErr("Add the parent or guardian's name.");
    for (const k of kids) {
      if (!k.name.trim()) return setErr("Every child needs a name.");
      if (k.age.trim() !== "" && !/^\d{1,3}$/.test(k.age.trim())) return setErr(`${k.name}: the age must be a whole number, or leave it blank if the email does not say.`);
    }
    setBusy(true);
    const res = await fetch("/api/admin/household", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "enter", parentName: parent.name, phone: parent.phone, email: parent.email, story: parent.story, source: "Printed email",
        kids: kids.map((k) => ({ fullName: k.name, age: k.age.trim() === "" ? null : Number(k.age), ageUnsure: k.unsure, gender: k.gender || null, tops: k.tops, bottoms: k.bottoms, shoes: k.shoes, wants: lines(k.wants), needs: lines(k.needs), faves: lines(k.faves), giftStore: k.giftStore })),
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error || "That didn't save.");
    setDone(j);
  }

  if (done)
    return (
      <div className="panel" role="status">
        <h3 style={{ color: "var(--pine)", marginBottom: 8 }}>Household saved{done.merged ? " (joined an existing household)" : ""}</h3>
        <ul className="list" style={{ marginBottom: 12 }}>
          {done.children.map((c) => (
            <li key={c.id}><b>{c.name}</b>: {c.decision === "set_aside" ? <span className="pill neutral">Set aside</span> : <span className="pill purchased">Needs review</span>} {c.reason && <span className="muted">{c.reason}</span>}</li>
          ))}
          {done.skipped.length > 0 && <li className="muted">Skipped (already entered): {done.skipped.join(", ")}</li>}
        </ul>
        <div className="acts">
          <Link className="btn" href={`/admin/households/${done.familyId}`}>Open household</Link>
          <button className="btn ghost" onClick={() => { setDone(null); setParent({ name: "", phone: "", email: "", story: "" }); setKids([blank()]); }}>Enter another household</button>
        </div>
      </div>
    );

  return (
    <form onSubmit={save} noValidate>
      {!confirmed && <div className="banner-warn">The season age limit is {maxAge} and has not been confirmed yet. Set it on the Households page before deciding anyone.</div>}
      <p className="muted" style={{ marginBottom: 12, fontSize: ".88rem" }}>Maximum age this season: <b>{maxAge}</b>. A child over it is set aside with a reason; a household whose only applicant is over it leaves the review queue.</p>
      <div className="panel private" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 10 }}>Household</h3>
        <div className="three">
          <div className="field"><label htmlFor="hp">Parent or guardian full name</label><input id="hp" value={parent.name} onChange={(e) => setParent({ ...parent, name: e.target.value })} autoComplete="off" /></div>
          <div className="field"><label htmlFor="hph">Phone</label><input id="hph" value={parent.phone} onChange={(e) => setParent({ ...parent, phone: e.target.value })} inputMode="tel" /></div>
          <div className="field"><label htmlFor="he">Email</label><input id="he" value={parent.email} onChange={(e) => setParent({ ...parent, email: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="hs">Their story or hardship (private)</label><textarea id="hs" style={{ minHeight: 70 }} value={parent.story} onChange={(e) => setParent({ ...parent, story: e.target.value })} /></div>
      </div>

      {kids.map((k, i) => (
        <section className="childbox" key={k.key} aria-label={`Child ${i + 1}`}>
          <h3>Child {i + 1}{kids.length > 1 && <button type="button" className="btn ghost sm" onClick={() => setKids((a) => a.filter((x) => x.key !== k.key))}>Remove</button>}</h3>
          <div className="three">
            <div className="field"><label htmlFor={`n${k.key}`}>Child&apos;s full name (private)</label><input id={`n${k.key}`} value={k.name} onChange={(e) => setKid(k.key, { name: e.target.value })} autoComplete="off" /></div>
            <div className="field"><label htmlFor={`a${k.key}`}>Age</label><input id={`a${k.key}`} inputMode="numeric" value={k.age} onChange={(e) => setKid(k.key, { age: e.target.value })} placeholder="blank if not stated" />
              <label className="check" style={{ margin: "4px 0 0" }}><input type="checkbox" checked={k.unsure} onChange={(e) => setKid(k.key, { unsure: e.target.checked })} /><span>Age is unclear in the email</span></label></div>
            <div className="field"><label htmlFor={`g${k.key}`}>Gender</label><select id={`g${k.key}`} value={k.gender} onChange={(e) => setKid(k.key, { gender: e.target.value })}><option value="">Not stated</option><option>Girl</option><option>Boy</option><option>Other</option></select></div>
          </div>
          <div className="three">
            <div className="field"><label htmlFor={`t${k.key}`}>Shirt</label><input id={`t${k.key}`} value={k.tops} onChange={(e) => setKid(k.key, { tops: e.target.value })} /></div>
            <div className="field"><label htmlFor={`b${k.key}`}>Pants</label><input id={`b${k.key}`} value={k.bottoms} onChange={(e) => setKid(k.key, { bottoms: e.target.value })} /></div>
            <div className="field"><label htmlFor={`s${k.key}`}>Shoes</label><input id={`s${k.key}`} value={k.shoes} onChange={(e) => setKid(k.key, { shoes: e.target.value })} /></div>
          </div>
          <div className="two">
            <div className="field"><label htmlFor={`w${k.key}`}>Wants (one per line)</label><textarea id={`w${k.key}`} value={k.wants} onChange={(e) => setKid(k.key, { wants: e.target.value })} /></div>
            <div className="field"><label htmlFor={`d${k.key}`}>Needs (one per line)</label><textarea id={`d${k.key}`} value={k.needs} onChange={(e) => setKid(k.key, { needs: e.target.value })} /></div>
          </div>
          <div className="two">
            <div className="field"><label htmlFor={`f${k.key}`}>Interests (up to 3, one per line)</label><textarea id={`f${k.key}`} style={{ minHeight: 64 }} value={k.faves} onChange={(e) => setKid(k.key, { faves: e.target.value })} /></div>
            <div className="field"><label htmlFor={`gs${k.key}`}>Gift card store (optional)</label><input id={`gs${k.key}`} value={k.giftStore} onChange={(e) => setKid(k.key, { giftStore: e.target.value })} /></div>
          </div>
        </section>
      ))}
      <div style={{ margin: "6px 0 16px" }}><button type="button" className="btn gold" disabled={kids.length >= 12} onClick={() => setKids((a) => [...a, blank()])}>+ Add another child</button></div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save household"}</button>
    </form>
  );
}
