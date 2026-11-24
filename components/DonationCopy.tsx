"use client";

import { useState } from "react";

export default function DonationCopy({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");
  return <div style={{ display: "grid", gap: 6 }}>
    <div className="fact" style={{ overflowWrap: "anywhere", fontWeight: 700, userSelect: "all" }}>{value}</div>
    <button type="button" className="btn ghost sm" onClick={async () => {
      try { await navigator.clipboard.writeText(value); setMessage("Copied!"); }
      catch { setMessage("Select the address above and copy it manually."); }
    }}>Copy {label}</button>
    <span className="muted" role="status" style={{ fontSize: ".82rem" }}>{message}</span>
  </div>;
}
