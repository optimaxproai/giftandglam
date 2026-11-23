"use client";
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ornament } from "../Ornament";

export type EditChild = {
  id: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  tops: string;
  bottoms: string;
  shoes: string;
  wants: string[];
  needs: string[];
  faves: string[];
  favColor: string;
  giftStore: string;
  giftAmount: number | null;
  photo: boolean;
  photoPublic: boolean;
  approved: boolean;
  notes: string;
};
export type EditFamily = { parentName: string; phone: string; email: string; story: string };

async function post(body: unknown): Promise<string | null> {
  const res = await fetch("/api/admin/child", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return null;
  return (await res.json().catch(() => ({}))).error || "Couldn't save";
}
const lines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);

export default function ChildEditor({ child, family }: { child: EditChild; family: EditFamily }) {
  const router = useRouter();
  const [c, setC] = useState({ ...child, wants: child.wants.join("\n"), needs: child.needs.join("\n"), faves: child.faves.join(", ") });
  const [f, setF] = useState(family);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState(0);
  const set = (p: Partial<typeof c>) => setC((x) => ({ ...x, ...p }));

  async function save() {
    setBusy(true);
    setMsg(null);
    const err = await post({
      action: "update",
      id: child.id,
      patch: {
        full_name: c.fullName,
        age: c.age == null || (c.age as unknown) === "" ? null : Number(c.age),
        gender: c.gender || null,
        tops: c.tops || null,
        bottoms: c.bottoms || null,
        shoes: c.shoes || null,
        wants: lines(c.wants),
        needs: lines(c.needs),
        faves: c.faves.split(",").map((s) => s.trim()).filter(Boolean),
        fav_color: c.favColor || null,
        gift_store: c.giftStore || null,
        gift_amount: c.giftStore ? Number(c.giftAmount) || 25 : null,
        organizer_notes: c.notes || null,
      },
      family: { parent_name: f.parentName, phone: f.phone || null, email: f.email || null, story: f.story || null },
    });
    setBusy(false);
    setMsg(err ? { ok: false, t: err } : { ok: true, t: "Saved." });
    if (!err) router.refresh();
  }

  async function newPhoto(file: File) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * s);
    cv.height = Math.round(bmp.height * s);
    cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const err = await post({ action: "photo", id: child.id, dataUrl: cv.toDataURL("image/jpeg", 0.82) });
    if (err) return setMsg({ ok: false, t: err });
    set({ photo: true });
    setVer((v) => v + 1);
    router.refresh();
  }

  async function removePhoto() {
    const err = await post({ action: "photo", id: child.id, dataUrl: null });
    if (err) return setMsg({ ok: false, t: err });
    set({ photo: false, photoPublic: false });
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel">
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
          {c.photo ? <img key={ver} src={`/api/photo/${child.id}?v=${ver}`} alt={`Photo of ${child.fullName}`} style={{ width: 132, height: 132, borderRadius: "50%", objectFit: "cover", border: "5px solid var(--gold)" }} /> : <Ornament id={child.id} name={c.fullName || "?"} photo={false} big />}
          <div className="acts">
            <label className="btn ghost sm" style={{ cursor: "pointer" }}>{c.photo ? "Replace photo" : "Add photo"}<input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && newPhoto(e.target.files[0])} /></label>
            {c.photo && <button className="btn ghost sm" onClick={removePhoto}>Remove photo</button>}
          </div>
        </div>
        <p className="muted" style={{ fontSize: ".85rem", marginBottom: 10 }}>Photos are only ever shown to organizers. Decisions and publishing are on the household page.</p>
        <div className="three">
          <div className="field"><label className="lbl" htmlFor="fn">Full name (private)</label><input id="fn" value={c.fullName} onChange={(e) => set({ fullName: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="ag">Age</label><input id="ag" type="number" min={0} max={21} value={c.age ?? ""} onChange={(e) => set({ age: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          <div className="field"><label className="lbl" htmlFor="gd">Gender</label><select id="gd" value={c.gender || ""} onChange={(e) => set({ gender: e.target.value })}><option value="">Not stated</option><option>Girl</option><option>Boy</option><option>Other</option></select></div>
        </div>
        <div className="three">
          <div className="field"><label className="lbl" htmlFor="tp">Shirt</label><input id="tp" value={c.tops} onChange={(e) => set({ tops: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="bt">Pants</label><input id="bt" value={c.bottoms} onChange={(e) => set({ bottoms: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="sh">Shoes</label><input id="sh" value={c.shoes} onChange={(e) => set({ shoes: e.target.value })} /></div>
        </div>
        <div className="two">
          <div className="field"><label className="lbl" htmlFor="wn">Wants (one per line)</label><textarea id="wn" value={c.wants} onChange={(e) => set({ wants: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="nd">Needs (one per line)</label><textarea id="nd" value={c.needs} onChange={(e) => set({ needs: e.target.value })} /></div>
        </div>
        <div className="three">
          <div className="field"><label className="lbl" htmlFor="fv">Favorites (max 3)</label><input id="fv" value={c.faves} onChange={(e) => set({ faves: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="gs">Gift card store</label><input id="gs" value={c.giftStore} onChange={(e) => set({ giftStore: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="ga">Gift card ($)</label><input id="ga" type="number" min={5} max={200} value={c.giftAmount ?? 25} onChange={(e) => set({ giftAmount: Number(e.target.value) })} /></div>
        </div>
        <div className="field"><label className="lbl" htmlFor="fc">Favorite color</label><input id="fc" value={c.favColor} onChange={(e) => set({ favColor: e.target.value })} /></div>
      </div>

      <div className="panel private">
        <h3 style={{ marginBottom: 10 }}>Parent or guardian</h3>
        <div className="three">
          <div className="field"><label className="lbl" htmlFor="pn">Name</label><input id="pn" value={f.parentName} onChange={(e) => setF({ ...f, parentName: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="pp">Phone</label><input id="pp" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="field"><label className="lbl" htmlFor="pe">Email</label><input id="pe" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div className="field"><label className="lbl" htmlFor="st">Their story</label><textarea id="st" style={{ minHeight: 70 }} value={f.story} onChange={(e) => setF({ ...f, story: e.target.value })} /></div>
        <div className="field"><label className="lbl" htmlFor="nt">Organizer notes</label><textarea id="nt" style={{ minHeight: 60 }} value={c.notes} onChange={(e) => set({ notes: e.target.value })} /></div>
      </div>

      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <div><button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
    </div>
  );
}
