"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRef, useState } from "react";
import type { DraftFamily } from "@/lib/parseSchema";
import ItemListEditor, { cleanListItems } from "./ItemListEditor";
import SizeField from "./SizeField";
import GiftCardEditor from "./GiftCardEditor";
import { cleanGiftCards, type GiftCard } from "@/lib/giftCards";
import {parseHouseholdCsv} from "@/lib/importCsv";

type Kid = {
  key: string;
  include: boolean;
  fullName: string;
  age: string;
  ageUnsure:boolean;
  gender: string;
  tops: string;
  bottoms: string;
  shoes: string;
  wants: string[];
  needs: string[];
  faves: string[];
  favColor: string;
  giftCards: GiftCard[];
  notes: string;
  photo: string | null;
};
type Fam = {
  key: string;
  label: string;
  parentName: string;
  phone: string;
  email: string;
  story: string;
  kids: Kid[];
  state: "draft" | "saving" | "saved" | "error";
  msg: string;
  familyId?: string;
};

const MAX_PAGES = 8;
let seq = 0;

/** Crops the photo box (fractions of the page) out of a rendered page, with a little breathing room. */
function crop(canvas: HTMLCanvasElement, b: { x: number; y: number; w: number; h: number }): string {
  const W = canvas.width;
  const H = canvas.height;
  const padX = b.w * 0.08;
  const padY = b.h * 0.08;
  const sx = Math.max(0, (b.x - padX) * W);
  const sy = Math.max(0, (b.y - padY) * H);
  const sw = Math.min(W - sx, (b.w + padX * 2) * W);
  const sh = Math.min(H - sy, (b.h + padY * 2) * H);
  const scale = Math.min(1, 640 / Math.max(sw, sh));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  out.getContext("2d")!.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.82);
}

async function renderFile(file: File): Promise<{ canvases: HTMLCanvasElement[]; text: string }> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
    }).promise;
    const canvases: HTMLCanvasElement[] = [];
    let text = "";
    for (let p = 1; p <= Math.min(pdf.numPages, MAX_PAGES); p++) {
      const page = await pdf.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 1400 / base.width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      canvases.push(canvas);
      const tc = await page.getTextContent();
      text += tc.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
    }
    return { canvases, text };
  }
  if (file.type.startsWith("image/")) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return { canvases: [canvas], text: "" };
  }
  return { canvases: [], text: await file.text() };
}

function toKid(c: DraftFamily["children"][number], canvases: HTMLCanvasElement[]): Kid {
  let photo: string | null = null;
  if (c.photo) {
    const cv = canvases[c.photo.page - 1];
    if (cv) photo = crop(cv, c.photo.box);
  }
  return {
    key: `k${++seq}`,
    include: true,
    fullName: c.fullName,
    age: c.age == null ? "" : String(c.age),
    ageUnsure:!!c.ageUnsure,
    gender: c.gender || "",
    tops: c.tops,
    bottoms: c.bottoms,
    shoes: c.shoes,
    wants: c.wants,
    needs: c.needs,
    faves: c.faves,
    favColor: c.favColor,
    giftCards: c.giftCards ?? (c.giftStore ? [{ store: c.giftStore, amount: c.giftAmount || 25 }] : []),
    notes: c.notes||"",
    photo,
  };
}

export default function ImportClient({demo=false}:{demo?:boolean}) {
  const [fams, setFams] = useState<Fam[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [paste, setPaste] = useState("");
  const [drag, setDrag] = useState(false);
  const [sample,setSample]=useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function parse(label: string, canvases: HTMLCanvasElement[], text: string) {
    const pages = canvases.map((c) => c.toDataURL("image/jpeg", 0.75).split(",")[1]);
    const res = await fetch("/api/admin/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages, text }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || "Couldn't read that file");
    if(j.demo)setSample(true);
    addDrafts(label,j.families||[],canvases);
  }

  function addDrafts(label:string,found:DraftFamily[],canvases:HTMLCanvasElement[]) {
    if (!found.length) throw new Error(`No children found in ${label}. Check the file or paste the email text.`);
    setFams((prev) => [
      ...prev,
      ...found.map(
        (f): Fam => ({
          key: `f${++seq}`,
          label:f.source||label,
          parentName: f.parentName,
          phone: f.phone,
          email: f.email,
          story: f.story,
          kids: f.children.map((c) => toKid(c, canvases)),
          state: "draft",
          msg: "",
        }),
      ),
    ]);
  }

  async function handleFiles(files: FileList | File[]) {
    setErr("");
    for (const file of Array.from(files)) {
      try {
        setBusy(`Reading ${file.name}…`);
        if(/\.csv$/i.test(file.name)||file.type==="text/csv") {
          if(file.size>2_000_000)throw new Error("Split CSV files larger than 2 MB into smaller batches.");
          addDrafts(file.name,parseHouseholdCsv(await file.text()),[]);
        } else if(demo) {throw new Error("This preview does not read real emails or PDFs. Use Load fictional email example below, or a fictional CSV.");}
        else { const { canvases, text } = await renderFile(file); await parse(file.name, canvases, text); }
      } catch (e) {
        setErr(`${file.name}: ${e instanceof Error ? e.message : "couldn't be read"}`);
      }
    }
    setBusy("");
  }

  async function handlePaste() {
    if (!demo&&!paste.trim()) return;
    setErr("");
    setBusy("Reading the pasted email…");
    try {
      await parse(demo?"Fictional review example":"Pasted email", [], demo?"Fictional sample only":paste);
      setPaste("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't read that");
    }
    setBusy("");
  }

  const setFam = (key: string, patch: Partial<Fam>) => setFams((p) => p.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  const setKid = (fk: string, kk: string, patch: Partial<Kid>) =>
    setFams((p) => p.map((f) => (f.key === fk ? { ...f, kids: f.kids.map((k) => (k.key === kk ? { ...k, ...patch } : k)) } : f)));

  async function replacePhoto(fk: string, kk: string, file: File) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    setKid(fk, kk, { photo: c.toDataURL("image/jpeg", 0.82) });
  }

  async function save(f: Fam) {
    const kids = f.kids.filter((k) => k.include);
    if (!f.parentName.trim()) return setFam(f.key, { state: "error", msg: "Add the parent's name." });
    if (!kids.length) return setFam(f.key, { state: "error", msg: "Tick at least one child." });
    for (const k of kids) {
      const n = cleanListItems(k.wants).length + cleanListItems(k.needs).length;
      if (!k.fullName.trim()) return setFam(f.key, { state: "error", msg: "Every child needs a name." });
      if (n === 0) return setFam(f.key, { state: "error", msg: `${k.fullName} has no wants or needs yet.` });
      if(k.giftCards.some(g=>g.store.trim()&&(!Number.isInteger(g.amount)||g.amount<5||g.amount>200))) return setFam(f.key,{state:"error",msg:`Confirm each gift card amount for ${k.fullName} ($5–$200) or remove that card.`});
    }
    setFam(f.key, { state: "saving", msg: "" });
    const res = await fetch("/api/admin/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        family: { parentName: f.parentName, phone: f.phone, email: f.email, story: f.story, source: f.label },
        children: kids.map((k) => ({
          fullName: k.fullName,
          age: k.age === "" ? null : Number(k.age),
          ageUnsure:k.ageUnsure,
          gender: k.gender || null,
          tops: k.tops,
          bottoms: k.bottoms,
          shoes: k.shoes,
          wants: cleanListItems(k.wants),
          needs: cleanListItems(k.needs),
          faves: cleanListItems(k.faves),
          favColor: k.favColor,
          giftStore: k.giftCards[0]?.store || "",
          giftAmount: k.giftCards[0]?.amount || 25,
          giftCards: cleanGiftCards(k.giftCards),
          notes: k.notes,
          photo: k.photo,
        })),
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setFam(f.key, { state: "error", msg: j.error || "Couldn't save" });
    const made = (j.created || []).map((c: { name: string; no: number }) => `${c.name} (No. ${String(c.no).padStart(2, "0")})`).join(", ");
    setFam(f.key, {
      state: "saved",
      familyId: j.familyId,
      msg: `${made || "Nothing new"} saved to Families for review${j.merged ? ", joined an existing family" : ""}${j.skipped?.length ? `. Skipped duplicates: ${j.skipped.join(", ")}` : ""}.`,
    });
  }

  return (
    <div>
      {demo&&<div className="banner-warn">Fictional review only. Do not upload real family records. CSV reads the actual rows locally; email/PDF extraction is simulated. <button type="button" className="btn sm" onClick={handlePaste} disabled={!!busy}>Load fictional email example</button></div>}
      <div
        className={`dropzone${drag ? " drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      >
        <h3>Drop family applications here</h3>
        <p className="muted" style={{ margin: "6px 0 14px" }}>CSV, PDF, screenshot, photo, or .txt / .eml. CSV is read in your browser without AI and saved only after review. Up to {MAX_PAGES} pages per PDF.</p>
        <button className="btn gold" onClick={() => input.current?.click()} disabled={!!busy}>Choose files</button>
        <input ref={input} type="file" multiple accept={demo?".csv,text/csv":".pdf,image/*,.txt,.eml,text/plain,.csv,text/csv"} hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <p style={{marginTop:10}}><a href="/household-import-template.csv" download>Download the full CSV template</a> · Use one row per child. For siblings, repeat the same parent or guardian name and email on each row. If there is no email, repeat the same phone number instead. Separate wants, needs and interests with semicolons. Additional gift cards: Store | Amount; Store | Amount.</p>
      </div>
      {!demo&&<details style={{ margin: "14px 0" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Or paste the email text</summary>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="paste" className="lbl">Email text</label>
          <textarea id="paste" value={paste} onChange={(e) => setPaste(e.target.value)} style={{ minHeight: 140 }} />
          <div><button className="btn sm" onClick={handlePaste} disabled={!!busy || !paste.trim()}>Read this email</button></div>
        </div>
      </details>}
      {busy && <div className="ok" role="status">{busy}</div>}
      {sample&&<div className="banner-warn">Review build: email or PDF reading returns a fixed fictional example, not the contents of your document. Use only fictional data in this preview. CSV reads the actual rows locally.</div>}
      {err && <div className="err" role="alert">{err}</div>}

      {fams.map((f) => (
        <section className="draft" key={f.key}>
          <div className="page-h" style={{ margin: 0 }}>
            <h3>Family request <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: ".85rem" }}>from {f.label}</span></h3>
            <span className={`pill ${f.state === "saved" ? "available" : f.state === "error" ? "late" : "neutral"}`}>{f.state === "saved" ? "Saved" : f.state === "saving" ? "Saving…" : f.state === "error" ? "Needs attention" : `${f.kids.length} child${f.kids.length === 1 ? "" : "ren"} found`}</span>
          </div>
          <div className="panel private" style={{ marginTop: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Parent or guardian</h3>
            <div className="three aligned-fields">
              <div className="field"><label className="lbl">Name</label><input value={f.parentName} onChange={(e) => setFam(f.key, { parentName: e.target.value })} /></div>
              <div className="field"><label className="lbl">Phone</label><input value={f.phone} onChange={(e) => setFam(f.key, { phone: e.target.value })} /></div>
              <div className="field"><label className="lbl">Email</label><input value={f.email} onChange={(e) => setFam(f.key, { email: e.target.value })} /></div>
            </div>
            <div className="field"><label className="lbl">Their story</label><textarea style={{ minHeight: 64 }} value={f.story} onChange={(e) => setFam(f.key, { story: e.target.value })} /></div>
          </div>

          {f.kids.map((k) => (
            <div className="kid" key={k.key}>
              <div>
                <div className="shot">{k.photo ? <img src={k.photo} alt={`Photo of ${k.fullName}`} /> : "No photo found"}</div>
                <div className="acts" style={{ marginTop: 6 }}>
                  <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                    {k.photo ? "Replace" : "Add photo"}
                    <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && replacePhoto(f.key, k.key, e.target.files[0])} />
                  </label>
                  {k.photo && <button className="btn ghost sm" onClick={() => setKid(f.key, k.key, { photo: null })}>Remove</button>}
                </div>
              </div>
              <div>
                <label className="check"><input type="checkbox" checked={k.include} onChange={(e) => setKid(f.key, k.key, { include: e.target.checked })} /><span><b>Add {k.fullName || "this child"} to the tree</b></span></label>
                <div className="three aligned-fields">
                  <div className="field"><label className="lbl">Full name (private)</label><input value={k.fullName} onChange={(e) => setKid(f.key, k.key, { fullName: e.target.value })} /></div>
                  <div className="field"><label className="lbl">Age <span style={{marginLeft:8}}><input type="checkbox" checked={k.ageUnsure} onChange={e=>setKid(f.key,k.key,{ageUnsure:e.target.checked})}/> Unclear</span></label><input type="number" min={0} max={120} value={k.age} onChange={(e) => setKid(f.key, k.key, { age: e.target.value })} /></div>
                  <div className="field"><label className="lbl">Gender</label><select value={k.gender} onChange={(e) => setKid(f.key, k.key, { gender: e.target.value })}><option value="">Not stated</option><option>Girl</option><option>Boy</option><option>Other</option></select></div>
                </div>
                <div className="three aligned-fields">
                  <SizeField kind="shirt" value={k.tops} onChange={(tops) => setKid(f.key, k.key, { tops })} />
                  <SizeField kind="pants" value={k.bottoms} onChange={(bottoms) => setKid(f.key, k.key, { bottoms })} />
                  <SizeField kind="shoes" value={k.shoes} onChange={(shoes) => setKid(f.key, k.key, { shoes })} />
                </div>
                <div className="two child-gift-fields">
                  <ItemListEditor kind="wants" items={k.wants} onChange={(wants) => setKid(f.key, k.key, { wants })} disabled={f.state === "saving" || f.state === "saved"} />
                  <ItemListEditor kind="needs" items={k.needs} onChange={(needs) => setKid(f.key, k.key, { needs })} disabled={f.state === "saving" || f.state === "saved"} />
                  <ItemListEditor kind="interests" items={k.faves} onChange={(faves) => setKid(f.key, k.key, { faves })} disabled={f.state === "saving" || f.state === "saved"} />
                  <GiftCardEditor cards={k.giftCards} onChange={(giftCards) => setKid(f.key, k.key, { giftCards })} disabled={f.state === "saving" || f.state === "saved"} />
                </div>
                <div className="field"><label className="lbl" htmlFor={`notes-${k.key}`}>Additional notes (private)</label><textarea id={`notes-${k.key}`} value={k.notes} maxLength={1000} onChange={(e) => setKid(f.key, k.key, { notes: e.target.value })} /></div>
              </div>
            </div>
          ))}

          <div style={{ borderTop: "2px dotted var(--line)", marginTop: 14, paddingTop: 12 }}>
            <p className="muted" style={{ fontSize: ".86rem", marginBottom: 8 }}>Children are saved as <b>Needs review</b>. The season age limit is applied automatically; approve and publish them from Families. Photos stay with organizers.</p>
            {f.msg && <div className={f.state === "saved" ? "ok" : "err"} role="status">{f.msg}</div>}
            <div className="acts">
              <button className="btn" onClick={() => save(f)} disabled={f.state === "saving" || f.state === "saved"}>{f.state === "saved" ? "Saved" : "Save family"}</button>
              {f.familyId && <Link className="btn ghost" href={`/admin/households/${f.familyId}`}>Open saved household</Link>}
              <button className="btn ghost" onClick={() => setFams((p) => p.filter((x) => x.key !== f.key))}>Remove from this page</button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
