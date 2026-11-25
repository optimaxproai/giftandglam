"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import ItemListEditor, { cleanListItems } from "./ItemListEditor";
import SizeField from "./SizeField";
import GiftCardEditor from "./GiftCardEditor";
import { cleanGiftCards, type GiftCard } from "@/lib/giftCards";

type Kid = { key: string; name: string; age: string; unsure: boolean; gender: string; tops: string; bottoms: string; shoes: string; wants: string[]; needs: string[]; faves: string[]; giftCards: GiftCard[]; notes: string };
const blank = (key = "k0"): Kid => ({ key, name: "", age: "", unsure: false, gender: "", tops: "", bottoms: "", shoes: "", wants: [], needs: [], faves: [], giftCards: [], notes: "" });

type Result = { familyId: string; parentName: string; childCount: number; merged: boolean; skipped: string[]; children: { id: string; name: string; decision: string; reason: string | null }[] };

/** Quick entry from a printed email: one household, then each child. The season's age limit is applied on save. */
export default function HouseholdForm({ maxAge, confirmed }: { maxAge: number; confirmed: boolean }) {
  const [parent, setParent] = useState({ name: "", phone: "", email: "", story: "" });
  const [kids, setKids] = useState<Kid[]>(() => [blank()]);
  const nextChild = useRef(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Result | null>(null);
  const setKid = (k: string, p: Partial<Kid>) => setKids((a) => a.map((x) => (x.key === k ? { ...x, ...p } : x)));

  function addChild() {
    const child = blank(`k${++nextChild.current}`);
    setKids((current) => [...current, child]);
  }

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
        kids: kids.map((k) => ({ fullName: k.name, age: k.age.trim() === "" ? null : Number(k.age), ageUnsure: k.unsure, gender: k.gender || null, tops: k.tops, bottoms: k.bottoms, shoes: k.shoes, wants: cleanListItems(k.wants), needs: cleanListItems(k.needs), faves: cleanListItems(k.faves), giftCards: cleanGiftCards(k.giftCards), notes: k.notes })),
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error || "That didn't save.");
    setDone(j);
  }

  function startAnother() {
    setDone(null);
    setParent({ name: "", phone: "", email: "", story: "" });
    setKids([blank()]);
    setErr("");
  }

  return (
    <>
      <div className="page-h">
        <h2>Enter a household</h2>
        {done && <button type="button" className="btn" onClick={startAnother}>+ Enter another household</button>}
      </div>
      <p className="muted" style={{ marginBottom: 16 }}>Type in one printed email: the parent first, then each child. Leave the age blank if the email does not give one; it will be flagged.</p>
      {done ? (
      <div className="panel" role="status">
        <h3 style={{ color: "var(--pine)", marginBottom: 8 }}>Household saved{done.merged ? " (joined an existing household)" : ""}</h3>
        <div className="tw"><table>
          <thead><tr><th>Parent or guardian</th><th>Children</th><th>New requests</th><th>Contact</th><th></th></tr></thead>
          <tbody><tr><td><b>{done.parentName}</b></td><td>{done.childCount}</td><td>{done.children.length} added · {done.children.filter((c) => c.decision === "pending").length} need review</td><td>{parent.phone || parent.email || "—"}</td><td><Link className="btn sm" href={`/admin/households/${done.familyId}`}>Open household</Link></td></tr></tbody>
        </table></div>
        {done.skipped.length > 0 && <p className="muted" style={{ marginTop: 8 }}>Already entered: {done.skipped.join(", ")}</p>}
        <div className="acts" style={{ marginTop: 12 }}><Link href="/admin/households" className="btn ghost sm">Search households</Link></div>
      </div>
      ) : (
    <form onSubmit={save}>
      {!confirmed && <div className="banner-warn">The season age limit is {maxAge} and has not been confirmed yet. Set it on the Households page before deciding anyone.</div>}
      <p className="muted" style={{ marginBottom: 12, fontSize: ".88rem" }}>Maximum age this season: <b>{maxAge}</b>. A child over it is set aside with a reason; a household whose only applicant is over it leaves the review queue.</p>
      <div className="panel private" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 10 }}>Household</h3>
        <div className="three aligned-fields">
          <div className="field"><label htmlFor="hp">Parent or guardian full name</label><input id="hp" value={parent.name} onChange={(e) => setParent({ ...parent, name: e.target.value })} autoComplete="off" /></div>
          <div className="field"><label htmlFor="hph">Phone</label><input id="hph" value={parent.phone} onChange={(e) => setParent({ ...parent, phone: e.target.value })} inputMode="tel" /></div>
          <div className="field"><label htmlFor="he">Email</label><input id="he" value={parent.email} onChange={(e) => setParent({ ...parent, email: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="hs">Their story or hardship (private)</label><textarea id="hs" style={{ minHeight: 70 }} value={parent.story} onChange={(e) => setParent({ ...parent, story: e.target.value })} /></div>
      </div>

      {kids.map((k, i) => (
        <section className="childbox" key={k.key} aria-label={`Child ${i + 1}`}>
          <h3>Child {i + 1}{kids.length > 1 && <button type="button" className="btn ghost sm" onClick={() => setKids((a) => a.filter((x) => x.key !== k.key))}>Remove</button>}</h3>
          <div className="three aligned-fields">
            <div className="field"><label htmlFor={`n${k.key}`}>Child&apos;s full name (private)</label><input id={`n${k.key}`} value={k.name} onChange={(e) => setKid(k.key, { name: e.target.value })} autoComplete="off" /></div>
            <div className="field"><div className="age-caption"><label className="lbl" htmlFor={`a${k.key}`}>Age</label><label className="check"><input type="checkbox" checked={k.unsure} onChange={(e) => setKid(k.key, { unsure: e.target.checked })} /><span>Unclear age</span></label></div><input id={`a${k.key}`} inputMode="numeric" value={k.age} onChange={(e) => setKid(k.key, { age: e.target.value })} placeholder="blank if not stated" /></div>
            <div className="field"><label htmlFor={`g${k.key}`}>Gender</label><select id={`g${k.key}`} value={k.gender} onChange={(e) => setKid(k.key, { gender: e.target.value })}><option value="">Not stated</option><option>Girl</option><option>Boy</option><option>Other</option></select></div>
          </div>
          <div className="three aligned-fields">
            <SizeField kind="shirt" value={k.tops} onChange={(tops) => setKid(k.key, { tops })} />
            <SizeField kind="pants" value={k.bottoms} onChange={(bottoms) => setKid(k.key, { bottoms })} />
            <SizeField kind="shoes" value={k.shoes} onChange={(shoes) => setKid(k.key, { shoes })} />
          </div>
          <div className="two child-gift-fields">
            <ItemListEditor kind="wants" items={k.wants} onChange={(wants) => setKid(k.key, { wants })} disabled={busy} />
            <ItemListEditor kind="needs" items={k.needs} onChange={(needs) => setKid(k.key, { needs })} disabled={busy} />
            <ItemListEditor kind="interests" items={k.faves} onChange={(faves) => setKid(k.key, { faves })} disabled={busy} />
            <GiftCardEditor cards={k.giftCards} onChange={(giftCards) => setKid(k.key, { giftCards })} disabled={busy} />
          </div>
          <div className="field"><label htmlFor={`notes-${k.key}`}>Additional notes (private)</label><textarea id={`notes-${k.key}`} maxLength={1000} value={k.notes} onChange={(e) => setKid(k.key, { notes: e.target.value })} placeholder="Sizing details, preferences or follow-up information" /></div>
        </section>
      ))}
      <div style={{ margin: "6px 0 16px" }}><button type="button" className="btn gold" disabled={kids.length >= 12} onClick={addChild}>+ Add another child</button></div>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save household"}</button>
    </form>
    )}
    </>
  );
}
