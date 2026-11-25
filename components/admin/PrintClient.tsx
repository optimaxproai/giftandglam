"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { DECISION_LABEL } from "@/lib/campaign/rules";
import type { Decision } from "@/lib/types";
import { CARDSTOCK, DEFAULT_CUSTOM_LAYOUT, STOCKS, customStock, defaultStock, paginate, stockById, type CustomLabelLayout, type LabelStockSetting, type Stock } from "@/lib/print";

export type PrintItem = { id: string; code: string; family: string; gender: string; age: string; published: boolean; status: string; name: string; familyId: string; decision: Decision };
const printable = (item: PrintItem) => item.decision === "approved" && !!item.code;

const PAPER_SIZES = [
  { id: "letter", name: "US Letter (8.5 × 11 in)", width: 8.5, height: 11 },
  { id: "legal", name: "US Legal (8.5 × 14 in)", width: 8.5, height: 14 },
  { id: "a4", name: "A4 (210 × 297 mm)", width: 210 / 25.4, height: 297 / 25.4 },
];

type NumberField = Exclude<keyof CustomLabelLayout, "cutGuides">;

function sizes(s: Stock) {
  const base = s.h < 1.3 ? { c: 13, l: 8.5 } : s.h < 2.6 ? { c: 26, l: 13 } : { c: 34, l: 16 };
  if (!s.page) return base;
  const scale = Math.min(1, s.w / 2, s.h / 0.65);
  return { c: base.c * scale, l: base.l * scale };
}

/** Organizer-only batch printing. Cardstock is the default until a label stock is saved. */
export default function PrintClient({ items, savedStock }: { items: PrintItem[]; savedStock: LabelStockSetting }) {
  const router = useRouter();
  const saved = defaultStock(savedStock);
  const initialLayout = saved.id === "custom" && savedStock && typeof savedStock === "object" ? savedStock : DEFAULT_CUSTOM_LAYOUT;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<"cardstock" | "labels" | "custom">(saved.id === "cardstock" || saved.id === "custom" ? saved.id : "labels");
  const [labelId, setLabelId] = useState(typeof savedStock === "string" && saved.id !== "cardstock" ? savedStock : "");
  const [paperSize, setPaperSize] = useState(() => PAPER_SIZES.find((paper) => paper.width === initialLayout.pageWidth && paper.height === initialLayout.pageHeight)?.id ?? "custom");
  const [layout, setLayout] = useState(initialLayout);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => items.filter((i) => (filter === "tree" ? i.published : filter === "unpublished" ? printable(i) && !i.published : filter === "sponsored" ? i.published && i.status !== "available" : filter === "approved" ? printable(i) : filter === "review" ? !printable(i) : true) && [i.name, i.family, i.code].join(" ").toLowerCase().includes(search.trim().toLowerCase())), [items, filter, search]);
  const chosen = items.filter((i) => printable(i) && picked.has(i.id));
  const custom = customStock(layout);
  const stock = format === "cardstock" ? CARDSTOCK : format === "custom" ? custom.stock : stockById(labelId);
  const paperName = stock?.page
    ? PAPER_SIZES.find((paper) => paper.id === paperSize)?.name ?? `${stock.page.width} × ${stock.page.height} in`
    : "US Letter";
  const pages = stock ? paginate(chosen, stock) : [];
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  function changePaperSize(id: string) {
    setPaperSize(id);
    const paper = PAPER_SIZES.find((size) => size.id === id);
    if (paper) setLayout((current) => ({ ...current, pageWidth: paper.width, pageHeight: paper.height }));
  }

  function layoutInput(field: NumberField, label: string, whole = false) {
    const value = layout[field];
    return (
      <label className="field">
        <span className="lbl">{label}</span>
        <input type="number" step={whole ? 1 : "any"} min={whole ? 1 : 0}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => {
            const next = e.target.valueAsNumber;
            setLayout((current) => ({ ...current, [field]: next }));
          }}
        />
      </label>
    );
  }

  async function saveStock(setting: LabelStockSetting) {
    setMsg("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/household", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save_label_stock", stock: setting }) });
      if (res.ok) {
        setMsg(setting ? "Saved. This layout is now the default." : "Cardstock is now the default.");
        router.refresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setMsg(result.error || "Could not save this layout. Try again.");
      }
      return res.ok;
    } catch {
      setMsg("Could not save this layout. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="no-print">
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <div className="panel">
            <h3 style={{ marginBottom: 8 }}>1. Choose angels</h3>
            <div className="acts" style={{ marginBottom: 10 }}>
              <select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ border: "2px solid var(--line)", borderRadius: 12, padding: "6px 10px" }}>
                <option value="all">All child requests</option><option value="approved">Approved angels</option><option value="review">Awaiting approval / set aside</option><option value="tree">On the tree</option><option value="unpublished">Approved, not published</option><option value="sponsored">Sponsored</option>
              </select>
              <button className="btn sm ghost" onClick={() => setPicked(new Set(visible.filter(printable).map((v) => v.id)))}>Select all approved shown</button>
              <button className="btn sm ghost" onClick={() => setPicked(new Set())}>Clear</button>
            </div>
            <div className="field"><input type="search" aria-label="Search angels" placeholder="Search child, parent or code" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            {visible.length === 0 ? <p className="muted">{items.length ? "No matching requests." : "Add a family to get started."}</p> : (
              <div className="tw" style={{ maxHeight: 360, overflowY: "auto" }}>
                <table>
                  <thead><tr><th></th><th>Angel / child</th><th>Parent</th><th>Gender</th><th>Age</th><th>Status</th></tr></thead>
                  <tbody>{visible.map((i) => (
                    <tr key={i.id}>
                      <td><input type="checkbox" aria-label={`Select ${i.code || i.name}`} disabled={!printable(i)} checked={printable(i) && picked.has(i.id)} onChange={() => toggle(i.id)} /></td>
                      <td><b>{i.code || "Pending"}</b><br /><span className="muted">{i.name}</span></td><td>{i.family}</td><td>{i.gender}</td><td>{i.age}</td>
                      <td>{printable(i) ? "Ready to print" : <Link href={`/admin/households/${i.familyId}`}>{DECISION_LABEL[i.decision]} · Review</Link>}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            )}
            <p className="muted" style={{ marginTop: 8, fontSize: ".85rem" }}>{chosen.length} selected</p>
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: 8 }}>2. Choose the paper</h3>
            <label className="check"><input type="radio" name="fmt" checked={format === "cardstock"} onChange={() => setFormat("cardstock")} /><span><b>US Letter cardstock, cut apart</b> (default): 10 cards per sheet with cut guides.</span></label>
            <label className="check"><input type="radio" name="fmt" checked={format === "labels"} onChange={() => setFormat("labels")} /><span><b>Avery label sheet</b></span></label>
            <label className="check"><input type="radio" name="fmt" checked={format === "custom"} onChange={() => setFormat("custom")} /><span><b>Custom layout</b></span></label>
            {format === "labels" && (
              <div className="field">
                <label className="lbl" htmlFor="stock">Label stock</label>
                <select id="stock" value={labelId} onChange={(e) => setLabelId(e.target.value)}>
                  <option value="">Choose a label stock…</option>
                  {STOCKS.filter((s) => s.id !== "cardstock").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {labelId && labelId !== savedStock && <div style={{ marginTop: 6 }}><button className="btn sm ghost" disabled={saving} onClick={() => saveStock(labelId)}>Use this label stock from now on</button></div>}
              </div>
            )}
            {format === "custom" && (
              <div>
                <label className="field">
                  <span className="lbl">Page size</span>
                  <select value={paperSize} onChange={(e) => changePaperSize(e.target.value)}>
                    {PAPER_SIZES.map((paper) => <option key={paper.id} value={paper.id}>{paper.name}</option>)}
                    <option value="custom">Custom size</option>
                  </select>
                </label>
                {paperSize === "custom" && (
                  <div className="two">{layoutInput("pageWidth", "Page width (in)")}{layoutInput("pageHeight", "Page height (in)")}</div>
                )}
                <div className="two">{layoutInput("width", "Label width (in)")}{layoutInput("height", "Label height (in)")}</div>
                <div className="two">{layoutInput("perPage", "Labels per page", true)}{layoutInput("columns", "Labels per row", true)}</div>
                <details style={{ marginBottom: 10 }}>
                  <summary>Margins and spacing</summary>
                  <div className="two" style={{ marginTop: 8 }}>{layoutInput("left", "Left margin (in)")}{layoutInput("top", "Top margin (in)")}</div>
                  <div className="two">{layoutInput("gapX", "Horizontal gap (in)")}{layoutInput("gapY", "Vertical gap (in)")}</div>
                </details>
                <label className="check">
                  <input type="checkbox" checked={layout.cutGuides} onChange={(e) => setLayout({ ...layout, cutGuides: e.target.checked })} />
                  <span>Show cut guides</span>
                </label>
                {custom.error && <p className="banner-warn" role="status">{custom.error}</p>}
                <button className="btn sm ghost" disabled={!custom.stock || saving} onClick={() => saveStock(layout)}>Save custom layout as default</button>
              </div>
            )}
            {saved.id !== "cardstock" && <div style={{ marginTop: 6 }}><button className="btn sm ghost" disabled={saving} onClick={() => saveStock(null).then((ok) => { if (ok) setFormat("cardstock"); })}>Go back to cardstock as the default</button></div>}
            <h3 style={{ margin: "14px 0 6px" }}>3. Print</h3>
            <p className="muted" style={{ fontSize: ".85rem", marginBottom: 8 }}>Each label shows the angel code, the parent&apos;s last name, gender and age. In the print window choose <b>{format === "custom" && !stock ? "your paper size" : paperName}</b>, scale <b>100% / Actual size</b>, and margins <b>None</b>.</p>
            <button className="btn" disabled={!chosen.length || !stock} onClick={() => window.print()}>{!stock ? (format === "custom" ? "Adjust the custom layout to print" : "Choose a label stock to preview") : chosen.length ? `Print ${chosen.length} (${pages.length} sheet${pages.length === 1 ? "" : "s"})` : "Select angels to print"}</button>
            {msg && <div className="ok" role="status" style={{ marginTop: 8 }}>{msg}</div>}
          </div>
        </div>
        <h3 style={{ margin: "22px 0 10px" }}>Print preview {stock && <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: ".85rem", fontWeight: 400 }}>· {stock.name}</span>}</h3>
        {!chosen.length && <div className="empty"><h3>Nothing selected</h3><p>Tick angels above to see the sheets here.</p></div>}
      </div>

      {stock?.page && <style>{`@media print { @page { size: ${stock.page.width}in ${stock.page.height}in; margin: 0; } }`}</style>}
      <div className={stock?.page ? "preview custom-preview" : "preview"} aria-label="Print preview">
        {stock && pages.map((pg, n) => (
          <div className="sheet" key={n} aria-label={`Sheet ${n + 1}`} style={stock.page ? { width: `${stock.page.width}in`, height: `${stock.page.height}in` } : undefined}>
            {pg.map(({ item, left, top }) => {
              const f = sizes(stock);
              return (
                <div key={item.id} className={`lab${stock.cutGuides ? " cut" : ""}`} style={{
                  left: `${left}in`, top: `${top}in`, width: `${stock.w}in`, height: `${stock.h}in`,
                  ...(stock.page ? { padding: `${Math.min(0.08, stock.h * 0.05)}in ${Math.min(0.14, stock.w * 0.05)}in`, overflowWrap: "anywhere" } : {}),
                }}>
                  <div className="lab-band" aria-hidden="true" />
                  <div className="lab-body">
                    <div className="n" style={{ fontSize: `${f.c * Math.min(1, 10 / Math.max((item.family || "").length, 6))}pt` }}>{item.family || "Family"}</div>
                    <div className="c" style={{ fontSize: `${f.c * 0.66}pt` }}>{item.code}</div>
                    <div className="m" style={{ fontSize: `${f.l}pt` }}>{[item.gender, item.age].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="lab-band" aria-hidden="true" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
