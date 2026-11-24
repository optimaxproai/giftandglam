"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CARDSTOCK, STOCKS, paginate, stockById, type Stock } from "@/lib/print";

export type PrintItem = { id: string; code: string; family: string; gender: string; age: string; published: boolean; status: string };

function sizes(s: Stock) {
  if (s.h < 1.3) return { c: 13, l: 8.5 };
  if (s.h < 2.6) return { c: 26, l: 13 };
  return { c: 34, l: 16 };
}

/** Organizer-only batch printing. Cardstock is the default until a label stock is saved. */
export default function PrintClient({ items, savedStock }: { items: PrintItem[]; savedStock: string | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [format, setFormat] = useState<"cardstock" | "labels">(savedStock ? "labels" : "cardstock");
  const [labelId, setLabelId] = useState(savedStock || "");
  const [msg, setMsg] = useState("");

  const visible = useMemo(() => items.filter((i) => (filter === "tree" ? i.published : filter === "unpublished" ? !i.published : filter === "sponsored" ? i.status !== "available" : true)), [items, filter]);
  const chosen = items.filter((i) => picked.has(i.id));
  const stock: Stock | null = format === "cardstock" ? CARDSTOCK : stockById(labelId);
  const pages = stock ? paginate(chosen, stock) : [];
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function saveStock(stockId: string | null) {
    setMsg("");
    const res = await fetch("/api/admin/household", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save_label_stock", stock: stockId }) });
    setMsg(res.ok ? (stockId ? "Saved. This label sheet is now the default." : "Back to cardstock as the default.") : "That didn't save.");
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="no-print">
        <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
          <div className="panel">
            <h3 style={{ marginBottom: 8 }}>1. Choose angels</h3>
            <div className="acts" style={{ marginBottom: 10 }}>
              <select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ border: "2px solid var(--line)", borderRadius: 12, padding: "6px 10px" }}>
                <option value="all">All approved angels</option><option value="tree">On the tree</option><option value="unpublished">Approved, not published</option><option value="sponsored">Sponsored</option>
              </select>
              <button className="btn sm ghost" onClick={() => setPicked(new Set(visible.map((v) => v.id)))}>Select all shown</button>
              <button className="btn sm ghost" onClick={() => setPicked(new Set())}>Clear</button>
            </div>
            {items.length === 0 ? <p className="muted">Approved angels appear here once you approve a child.</p> : (
              <div className="tw" style={{ maxHeight: 360, overflowY: "auto" }}>
                <table>
                  <thead><tr><th></th><th>Angel</th><th>Parent</th><th>Gender</th><th>Age</th></tr></thead>
                  <tbody>{visible.map((i) => (
                    <tr key={i.id}>
                      <td><input type="checkbox" aria-label={`Select ${i.code}`} checked={picked.has(i.id)} onChange={() => toggle(i.id)} /></td>
                      <td><b>{i.code}</b></td><td>{i.family}</td><td>{i.gender}</td><td>{i.age}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            )}
            <p className="muted" style={{ marginTop: 8, fontSize: ".85rem" }}>{chosen.length} selected</p>
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: 8 }}>2. Choose the paper</h3>
            <label className="check"><input type="radio" name="fmt" checked={format === "cardstock"} onChange={() => setFormat("cardstock")} /><span><b>US Letter cardstock, cut apart</b> (default): 10 cards per sheet with cut guides.</span></label>
            <label className="check"><input type="radio" name="fmt" checked={format === "labels"} onChange={() => setFormat("labels")} /><span><b>Label sheet</b>: pick your stock</span></label>
            {format === "labels" && (
              <div className="field">
                <label className="lbl" htmlFor="stock">Label stock</label>
                <select id="stock" value={labelId} onChange={(e) => setLabelId(e.target.value)}>
                  <option value="">Choose a label stock…</option>
                  {STOCKS.filter((s) => s.id !== "cardstock").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {labelId && labelId !== savedStock && <div style={{ marginTop: 6 }}><button className="btn sm ghost" onClick={() => saveStock(labelId)}>Use this label stock from now on</button></div>}
                {savedStock && <div style={{ marginTop: 6 }}><button className="btn sm ghost" onClick={() => { setFormat("cardstock"); saveStock(null); }}>Go back to cardstock as the default</button></div>}
              </div>
            )}
            <h3 style={{ margin: "14px 0 6px" }}>3. Print</h3>
            <p className="muted" style={{ fontSize: ".85rem", marginBottom: 8 }}>Each label shows the angel code, the parent&apos;s last name, gender and age. In the print window choose <b>US Letter</b>, scale <b>100% / Actual size</b>, and margins <b>None</b>.</p>
            <button className="btn" disabled={!chosen.length || !stock} onClick={() => window.print()}>{!stock ? "Choose a label stock to preview" : chosen.length ? `Print ${chosen.length} (${pages.length} sheet${pages.length === 1 ? "" : "s"})` : "Select angels to print"}</button>
            {msg && <div className="ok" role="status" style={{ marginTop: 8 }}>{msg}</div>}
          </div>
        </div>
        <h3 style={{ margin: "22px 0 10px" }}>Print preview {stock && <span className="muted" style={{ fontFamily: "var(--font-body)", fontSize: ".85rem", fontWeight: 400 }}>· {stock.name}</span>}</h3>
        {!chosen.length && <div className="empty"><h3>Nothing selected</h3><p>Tick angels above to see the sheets here.</p></div>}
      </div>

      <div className="preview" aria-label="Print preview">
        {stock && pages.map((pg, n) => (
          <div className="sheet" key={n} aria-label={`Sheet ${n + 1}`}>
            {pg.map(({ item, left, top }) => {
              const f = sizes(stock);
              return (
                <div key={item.id} className={`lab${stock.cutGuides ? " cut" : ""}`} style={{ left: `${left}in`, top: `${top}in`, width: `${stock.w}in`, height: `${stock.h}in` }}>
                  <div className="c" style={{ fontSize: `${f.c}pt` }}>{item.code}</div>
                  <div className="l" style={{ fontSize: `${f.l}pt` }}>{item.family}{stock.h < 1.3 ? " · " : ""}{stock.h < 1.3 ? [item.gender, item.age].filter(Boolean).join(" · ") : ""}</div>
                  {stock.h >= 1.3 && <div className="l" style={{ fontSize: `${f.l}pt` }}>{[item.gender, item.age].filter(Boolean).join(" · ")}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
