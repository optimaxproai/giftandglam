"use client";
import { useRef, useState } from "react";
import { LIMITS, validateSubmission, type SubmissionErrors } from "@/lib/intake/validate";
import type { Question } from "@/lib/intake/types";

type Vals = Record<string, string>;
let seq = 0;
const newKid = () => ({ key: `k${++seq}`, v: {} as Vals });

function Field({ q, id, value, error, onChange }: { q: Question; id: string; value: string; error?: string; onChange: (v: string) => void }) {
  const common = { id, value, "aria-required": q.required, "aria-invalid": !!error, "aria-describedby": error ? `${id}-err` : undefined } as const;
  return (
    <div className={`field${error ? " bad" : ""}`} data-q={q.id}>
      <label htmlFor={id}>
        {q.prompt} {q.required ? <><span className="req" aria-hidden="true">*</span><span className="sr-only"> (required)</span></> : <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>}
      </label>
      {q.help && <small>{q.help}</small>}
      {q.type === "longtext" || q.type === "list" ? (
        <textarea {...common} onChange={(e) => onChange(e.target.value)} style={{ minHeight: q.type === "longtext" ? 110 : 96 }} />
      ) : q.type === "choice" ? (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {(q.options || []).map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input {...common} type={q.type === "number" ? "number" : "text"} inputMode={q.type === "number" ? "numeric" : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <div className="msg" id={`${id}-err`} role="alert">{error}</div>}
    </div>
  );
}

/** One application per household. In preview mode it validates but never sends anything. */
export default function ApplyForm({ questions, preview = false }: { questions: Question[]; preview?: boolean }) {
  const hq = questions.filter((q) => q.scope === "household");
  const cq = questions.filter((q) => q.scope === "child");
  const [household, setHousehold] = useState<Vals>({});
  const [kids, setKids] = useState([newKid()]);
  const [errors, setErrors] = useState<SubmissionErrors | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [previewMsg, setPreviewMsg] = useState("");
  const root = useRef<HTMLFormElement>(null);

  const focusFirstError = () => setTimeout(() => root.current?.querySelector<HTMLElement>(".field.bad input, .field.bad textarea, .field.bad select")?.focus(), 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setPreviewMsg("");
    const website = String(new FormData(e.currentTarget).get("website") || "");
    const input = { household, children: kids.map((k) => k.v) };
    const v = validateSubmission({ questions }, input);
    if (!v.ok) {
      setErrors(v.errors);
      if (v.errors.form) setFormError(v.errors.form);
      focusFirstError();
      return;
    }
    setErrors(null);
    if (preview) return setPreviewMsg("Preview only. Nothing was sent. Every required question is answered, so a family could submit this.");
    setBusy(true);
    try {
      const res = await fetch("/api/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, website }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setDone(String(j.id));
      else {
        if (j.errors) { setErrors(j.errors); focusFirstError(); }
        setFormError(j.error || "We couldn't send your application. Please try again.");
      }
    } catch {
      setFormError("We couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (done)
    return (
      <div className="panel" role="status">
        <div className="ribbon" />
        <h2 style={{ color: "var(--pine)", fontSize: "2rem" }}>Application received</h2>
        <p style={{ margin: "10px 0" }}>Thank you. The organizers will review your application and contact you if they need anything. You do not need to apply again.</p>
        <p className="muted">Your reference: <b>{done}</b></p>
      </div>
    );

  return (
    <form ref={root} onSubmit={submit} noValidate>
      <div className="panel private" style={{ marginBottom: 14 }}>
        <h3 style={{ marginBottom: 12 }}>About your household</h3>
        {hq.map((q) => <Field key={q.id} q={q} id={`h-${q.id}`} value={household[q.id] || ""} error={errors?.household[q.id]} onChange={(v) => setHousehold((h) => ({ ...h, [q.id]: v }))} />)}
      </div>

      {kids.map((k, i) => (
        <section className="childbox" key={k.key} aria-label={`Child ${i + 1}`}>
          <h3>
            Child {i + 1}
            {kids.length > 1 && <button type="button" className="btn ghost sm" onClick={() => setKids((ks) => ks.filter((x) => x.key !== k.key))}>Remove this child</button>}
          </h3>
          {cq.map((q) => (
            <Field key={q.id} q={q} id={`c${i}-${q.id}`} value={k.v[q.id] || ""} error={errors?.children[i]?.[q.id]} onChange={(v) => setKids((ks) => ks.map((x) => (x.key === k.key ? { ...x, v: { ...x.v, [q.id]: v } } : x)))} />
          ))}
        </section>
      ))}

      <div style={{ margin: "6px 0 16px" }}>
        <button type="button" className="btn gold" disabled={kids.length >= LIMITS.children} onClick={() => setKids((ks) => [...ks, newKid()])}>+ Add another child</button>
        <span className="muted" style={{ marginLeft: 10, fontSize: ".85rem" }}>One application covers everyone in your household.</span>
      </div>

      <input name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />
      <p className="muted" style={{ fontSize: ".86rem", marginBottom: 12 }}>
        Only the organizers see names, contact details and your private answers. Sponsors see an angel code, an age range, and the wishes, needs and sizes you list. Questions marked <span className="req">*</span> are required.
      </p>
      {formError && <div className="err" role="alert">{formError}</div>}
      {errors && !formError && <div className="err" role="alert">Please answer the highlighted questions.</div>}
      {previewMsg && <div className="ok" role="status">{previewMsg}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : preview ? "Check the form" : "Submit application"}</button>
    </form>
  );
}
