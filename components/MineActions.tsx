"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MineActions({ token, childId, status }: { token: string; childId: string; status: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [err, setErr] = useState("");
  const [busy,setBusy]=useState(false);

  async function act(action: "bought" | "release") {
    setErr("");
    setBusy(true);
    try { const res = await fetch("/api/mine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, childId, action }),
    });
    if (res.ok) router.refresh();
    else setErr((await res.json().catch(() => ({}))).error || "That didn't save. Please try again.");
    } catch { setErr("Could not connect. Try again."); } finally { setBusy(false); }
  }

  if (status !== "claimed" && status !== "purchased") return null;
  return (
    <div>
      <div className="acts" style={{ justifyContent: "center" }}>
        {status === "claimed" && <button className="btn sm green" disabled={busy} onClick={() => act("bought")}>Done shopping</button>}
        {status === "purchased" && <span className="pill available">Shopping complete</span>}
        {sure ? (
          <button className="btn sm" disabled={busy} onClick={() => act("release")}>Yes, release this angel</button>
        ) : (
          <button className="btn sm ghost" onClick={() => setSure(true)}>Release this angel</button>
        )}
      </div>
      <p className="muted" style={{fontSize:".8rem",marginTop:8}}>Done shopping keeps any unchecked items outstanding. If gifts have already been received, contact the organizer to change your sponsorship.</p>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
