"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AGE_RANGES } from "@/lib/intake/card";
import type { AppStatus, PublicCard } from "@/lib/intake/types";

export type ReviewChild = { id: string; label: string; code?: string; published: boolean; card?: PublicCard };

export default function ReviewActions({ id, status, note: initialNote, kids }: { id: string; status: AppStatus; note: string; kids: ReviewChild[] }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<Record<string, { ageRange: string; wishes: string; needs: string; sizes: string; interests: string }>>(() =>
    Object.fromEntries(kids.filter((k) => k.card).map((k) => [k.id, { ageRange: k.card!.ageRange, wishes: k.card!.wishes.join("\n"), needs: k.card!.needs.join("\n"), sizes: k.card!.sizes, interests: k.card!.interests.join("\n") }])),
  );

  async function act(step: string, label: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "review", id, step, note: note || undefined, ...extra }) });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, t: label });
      router.refresh();
    } else setMsg({ ok: false, t: (await res.json().catch(() => ({}))).error || "That didn't save." });
  }
  const cardBody = (k: string) => {
    const c = cards[k];
    const lines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
    return { ageRange: c.ageRange, wishes: lines(c.wishes), needs: lines(c.needs), sizes: c.sizes, interests: lines(c.interests) };
  };
  const setCard = (k: string, p: Partial<(typeof cards)[string]>) => setCards((c) => ({ ...c, [k]: { ...c[k], ...p } }));
  const approved = status === "approved";
  const anyPublished = kids.some((k) => k.published);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="panel">
        <h3 style={{ marginBottom: 10 }}>Decision</h3>
        <div className="field">
          <label htmlFor="note" className="lbl">Note to keep on record {status === "needs_info" ? "" : "(required for “Request more information”)"}</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div className="acts">
          <button className="btn green" disabled={busy || approved} onClick={() => act("approve", "Approved. Nothing is public yet: publish each angel below when you are ready.")}>{approved ? "Approved" : "Approve"}</button>
          <button className="btn ghost" disabled={busy || anyPublished} onClick={() => act("needs_info", "Marked as needing more information.")}>Request more information</button>
          <button className="btn ghost" disabled={busy || anyPublished} onClick={() => act("decline", "Declined. The application stays on record.")}>Decline</button>
        </div>
        {anyPublished && <p className="muted" style={{ fontSize: ".82rem", marginTop: 8 }}>Unpublish this household&apos;s angels before changing the decision.</p>}
      </div>

      {approved ? (
        <div className="panel">
          <h3 style={{ marginBottom: 4 }}>Approved shopping details and publishing</h3>
          <p className="muted" style={{ marginBottom: 12, fontSize: ".86rem" }}>Approval does not put anyone on the tree. Check what sponsors will see, then publish each angel.</p>
          {kids.map((k) =>
            cards[k.id] ? (
              <div className="sponsor-card" key={k.id} style={{ marginBottom: 12 }}>
                <div className="row" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <b>{k.code} <span className="muted" style={{ fontWeight: 400 }}>· {k.label}</span></b>
                  <span className={`pill ${k.published ? "available" : "neutral"}`}>{k.published ? "On the tree" : "Not published"}</span>
                </div>
                <div className="field"><label className="lbl" htmlFor={`ar-${k.id}`}>Age range shown to sponsors</label>
                  <select id={`ar-${k.id}`} value={cards[k.id].ageRange} onChange={(e) => setCard(k.id, { ageRange: e.target.value })}>{[...AGE_RANGES, "Not stated"].map((r) => <option key={r}>{r}</option>)}</select></div>
                <div className="two">
                  <div className="field"><label className="lbl" htmlFor={`w-${k.id}`}>Wishes (one per line)</label><textarea id={`w-${k.id}`} value={cards[k.id].wishes} onChange={(e) => setCard(k.id, { wishes: e.target.value })} /></div>
                  <div className="field"><label className="lbl" htmlFor={`n-${k.id}`}>Needs (one per line)</label><textarea id={`n-${k.id}`} value={cards[k.id].needs} onChange={(e) => setCard(k.id, { needs: e.target.value })} /></div>
                </div>
                <div className="two">
                  <div className="field"><label className="lbl" htmlFor={`s-${k.id}`}>Sizes</label><input id={`s-${k.id}`} value={cards[k.id].sizes} onChange={(e) => setCard(k.id, { sizes: e.target.value })} /></div>
                  <div className="field"><label className="lbl" htmlFor={`i-${k.id}`}>Interests (up to 3, one per line)</label><textarea id={`i-${k.id}`} style={{ minHeight: 60 }} value={cards[k.id].interests} onChange={(e) => setCard(k.id, { interests: e.target.value })} /></div>
                </div>
                <div className="acts">
                  <button className="btn sm ghost" disabled={busy} onClick={() => act("update_card", `Saved details for ${k.code}.`, { childId: k.id, card: cardBody(k.id) })}>Save details</button>
                  {k.published ? (
                    <button className="btn sm ghost" disabled={busy} onClick={() => act("unpublish", `${k.code} removed from the tree.`, { childId: k.id })}>Unpublish</button>
                  ) : (
                    <button className="btn sm green" disabled={busy} onClick={() => act("publish", `${k.code} is on the tree.`, { childId: k.id })}>Publish to the tree</button>
                  )}
                </div>
              </div>
            ) : null,
          )}
          {kids.length > 1 && <button className="btn sm gold" disabled={busy || kids.every((k) => k.published)} onClick={() => act("publish_all", "Every angel in this household is on the tree.")}>Publish all</button>}
        </div>
      ) : (
        <div className="panel"><h3 style={{ marginBottom: 6 }}>Public card</h3><p className="muted">Angel codes and shopping details are created when you approve the application.</p></div>
      )}
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
    </div>
  );
}
