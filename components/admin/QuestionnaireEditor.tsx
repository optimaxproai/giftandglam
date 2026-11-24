"use client";
import { useState } from "react";
import ApplyForm from "../ApplyForm";
import { KEY_LABEL } from "@/lib/intake/defaults";
import type { QType, Question, Scope } from "@/lib/intake/types";

const TYPES: [QType, string][] = [["text", "Short answer"], ["longtext", "Long answer"], ["number", "Number"], ["choice", "Choice"], ["list", "List (one per line)"]];
const rid = () => `q_${Math.random().toString(36).slice(2, 9)}`;

async function post(body: unknown): Promise<string | null> {
  const res = await fetch("/api/admin/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.ok ? null : (await res.json().catch(() => ({}))).error || "That didn't save.";
}

export default function QuestionnaireEditor({ initial, savedChanged, publishedVersion, draftVersion }: { initial: Question[]; savedChanged: boolean; publishedVersion: number | null; draftVersion: number }) {
  const [qs, setQs] = useState<Question[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [unpublished, setUnpublished] = useState(savedChanged);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<"" | "publish" | "discard" | string>("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(qs) !== saved;

  const upd = (id: string, p: Partial<Question>) => setQs((a) => a.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const add = (scope: Scope) => setQs((a) => [...a, { id: rid(), scope, prompt: "", type: "text", required: false }]);
  const move = (id: string, dir: -1 | 1) =>
    setQs((a) => {
      const i = a.findIndex((q) => q.id === id);
      let j = i + dir;
      while (j >= 0 && j < a.length && a[j].scope !== a[i].scope) j += dir;
      if (j < 0 || j >= a.length) return a;
      const b = [...a];
      [b[i], b[j]] = [b[j], b[i]];
      return b;
    });
  const remove = (id: string) => { setQs((a) => a.filter((q) => q.id !== id)); setConfirm(""); };

  async function run(label: string, body: unknown, after?: () => void) {
    setBusy(true); setMsg(null); setConfirm("");
    const err = await post(body);
    setBusy(false);
    if (err) return setMsg({ ok: false, t: err });
    setMsg({ ok: true, t: label });
    after?.();
  }

  const clean = (): Question[] => qs.map((q) => ({ ...q, prompt: q.prompt.trim(), options: q.type === "choice" ? (q.options || []).map((o) => o.trim()).filter(Boolean) : undefined }));
  const save = () => run("Draft saved. It is not live until you publish.", { action: "save_draft", questions: clean() }, () => { setSaved(JSON.stringify(qs)); setUnpublished(true); });

  const section = (scope: Scope, title: string, sub: string) => (
    <div style={{ marginBottom: 22 }}>
      <h3>{title}</h3>
      <p className="muted" style={{ margin: "4px 0 12px", fontSize: ".88rem" }}>{sub}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {qs.filter((q) => q.scope === scope).map((q, n, arr) => (
          <div className="qcard" key={q.id}>
            <div className="row">
              <span className="no">Question {n + 1}</span>
              <div className="acts">
                {q.key && <span className="chip" title="The app uses this question for the queue or the public card">Used for: {KEY_LABEL[q.key]}</span>}
                <button type="button" className="btn ghost sm" disabled={n === 0} onClick={() => move(q.id, -1)} aria-label={`Move question ${n + 1} up`}>↑</button>
                <button type="button" className="btn ghost sm" disabled={n === arr.length - 1} onClick={() => move(q.id, 1)} aria-label={`Move question ${n + 1} down`}>↓</button>
                {confirm === q.id ? (
                  <button type="button" className="btn sm" onClick={() => remove(q.id)}>Yes, delete</button>
                ) : (
                  <button type="button" className="btn ghost sm" onClick={() => setConfirm(q.id)}>Delete</button>
                )}
              </div>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`p-${q.id}`}>Question wording</label>
              <input id={`p-${q.id}`} value={q.prompt} onChange={(e) => upd(q.id, { prompt: e.target.value })} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`h-${q.id}`}>Help text (optional)</label>
              <input id={`h-${q.id}`} value={q.help || ""} onChange={(e) => upd(q.id, { help: e.target.value || undefined })} />
            </div>
            <div className="two">
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`t-${q.id}`}>Answer type</label>
                <select id={`t-${q.id}`} value={q.type} onChange={(e) => upd(q.id, { type: e.target.value as QType, options: e.target.value === "choice" ? q.options || ["", ""] : undefined })}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <label className="check" style={{ alignSelf: "end", marginBottom: 8 }}>
                <input type="checkbox" checked={q.required} onChange={(e) => upd(q.id, { required: e.target.checked })} />
                <span><b>Required</b> (a family cannot submit without answering)</span>
              </label>
            </div>
            {q.type === "choice" && (
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`o-${q.id}`}>Options (one per line, at least 2)</label>
                <textarea id={`o-${q.id}`} style={{ minHeight: 70 }} value={(q.options || []).join("\n")} onChange={(e) => upd(q.id, { options: e.target.value.split("\n") })} />
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => add(scope)}>+ Add a {scope === "household" ? "household" : "child"} question</button>
    </div>
  );

  return (
    <div>
      <div className="chips" style={{ marginBottom: 16 }}>
        <span className={`pill ${publishedVersion ? "available" : "late"}`}>{publishedVersion ? `Live: version ${publishedVersion}` : "Not published yet"}</span>
        {(dirty || unpublished) && <span className="pill purchased">Draft v{draftVersion} has unpublished changes</span>}
        {dirty && <span className="pill late">Unsaved edits</span>}
      </div>

      {section("household", "About the household", "Asked once per application. Put the private hardship question here.")}
      {section("child", "About each child", "Repeated for every child. Families use Add another child.")}

      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <div className="acts" style={{ position: "sticky", bottom: 10, background: "var(--frost)", padding: "10px 0" }}>
        <button className="btn" onClick={save} disabled={busy || !dirty}>Save draft</button>
        <button className="btn ghost" onClick={() => setPreview((p) => !p)}>{preview ? "Hide preview" : "Preview draft"}</button>
        {confirm === "publish" ? (
          <button className="btn green" onClick={() => run("Published. New applications use this version.", { action: "publish" }, () => { setUnpublished(false); setTimeout(() => location.reload(), 600); })} disabled={busy}>Yes, publish to families</button>
        ) : (
          <button className="btn gold" onClick={() => setConfirm("publish")} disabled={busy || dirty || !unpublished}>{dirty ? "Save before publishing" : "Publish"}</button>
        )}
        {confirm === "discard" ? (
          <button className="btn" onClick={() => run("Draft reset to the live version.", { action: "discard_draft" }, () => location.reload())} disabled={busy}>Yes, discard my draft changes</button>
        ) : (
          <button className="btn ghost" onClick={() => setConfirm("discard")} disabled={busy || (!dirty && !unpublished)}>Discard draft changes</button>
        )}
      </div>
      {confirm === "publish" && <p className="muted" style={{ fontSize: ".85rem" }}>Publishing changes the form for new applications only. Applications already submitted keep the exact wording and answers they were given.</p>}

      {preview && (
        <div style={{ marginTop: 20 }}>
          <div className="banner-preview ok">Draft preview. This is what families will see once you publish. Submitting here only checks the form.</div>
          <ApplyForm questions={clean()} preview />
        </div>
      )}
    </div>
  );
}
