"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MineActions({ token, childId, status }: { token: string; childId: string; status: string }) {
  const router = useRouter();
  const [sure, setSure] = useState(false);
  const [err, setErr] = useState("");

  async function act(action: "bought" | "release") {
    setErr("");
    const res = await fetch("/api/mine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, childId, action }),
    });
    if (res.ok) router.refresh();
    else setErr((await res.json().catch(() => ({}))).error || "That didn't save. Please try again.");
  }

  if (status !== "claimed" && status !== "purchased") return null;
  return (
    <div>
      <div className="acts" style={{ justifyContent: "center" }}>
        {status === "claimed" && <button className="btn sm green" onClick={() => act("bought")}>I&apos;ve bought the gifts</button>}
        {sure ? (
          <button className="btn sm" onClick={() => act("release")}>Yes, release this angel</button>
        ) : (
          <button className="btn sm ghost" onClick={() => setSure(true)}>Release this angel</button>
        )}
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
