"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/types";

export default function StatusButtons({ id, status, gift, compact = false }: { id: string; status: Status; gift: string; compact?: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");

  async function post(body: unknown) {
    setErr("");
    const res = await fetch("/api/admin/child", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) router.refresh();
    else setErr((await res.json().catch(() => ({}))).error || "Couldn't save");
  }

  return (
    <div>
      <div className="acts">
        {(status === "claimed" || status === "purchased") && <button className="btn sm green" onClick={() => post({ action: "status", id, status: "returned" })}>Check in gifts</button>}
        {status === "returned" && <button className="btn sm green" onClick={() => post({ action: "status", id, status: "given" })}>Mark given out</button>}
        {gift === "pledged" && <button className="btn sm ghost" onClick={() => post({ action: "gift", id, value: "received" })}>Card received</button>}
        {!compact &&
          STATUS_ORDER.filter((s) => s !== status).map((s) => (
            <button key={s} className="btn sm ghost" onClick={() => post({ action: "status", id, status: s })}>Set: {STATUS_LABEL[s]}</button>
          ))}
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
