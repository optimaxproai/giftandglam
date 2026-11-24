"use client";
import { useState } from "react";

/** Review build only: puts the fictional 2026 records back to their starting point. */
export default function ResetCampaign() {
  const [state, setState] = useState<"idle" | "sure" | "busy">("idle");
  async function go() {
    setState("busy");
    await fetch("/api/admin/household", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reset_review" }) });
    location.reload();
  }
  return state === "sure" ? <button className="btn sm" onClick={go}>Yes, reset the review data</button> : <button className="btn sm ghost" onClick={() => setState("sure")} disabled={state === "busy"}>Reset review data</button>;
}
