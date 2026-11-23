"use client";
import { useState } from "react";

/** Password input with a show/hide eye so people can check what they typed. */
export default function PasswordField({ id, label, value, onChange, autoComplete = "current-password", hint }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: "relative" }}>
        <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} style={{ width: "100%", paddingRight: 48 }} required />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", cursor: "pointer", padding: 8, color: "var(--muted)", display: "grid" }}
        >
          {show ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 004.2 4.2" /><path d="M9.9 5.1A10.9 10.9 0 0112 5c6 0 10 7 10 7a17.6 17.6 0 01-3.2 4M6.1 6.1A17.5 17.5 0 002 12s4 7 10 7a10.6 10.6 0 004.1-.8" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
