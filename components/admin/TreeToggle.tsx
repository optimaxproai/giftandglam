"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** On the tree: Yes / No. Publishing is separate from approval, so a child can only be switched on once approved with a code. */
export default function TreeToggle({ childId, on, canPublish }: { childId: string; on: boolean; canPublish: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(on);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blocked = !value && !canPublish;

  async function flip() {
    if (busy || blocked) return;
    const next = !value;
    setBusy(true);
    setErr("");
    setValue(next);
    try {
      const res = await fetch("/api/admin/household", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: next ? "publish" : "unpublish", childId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save.");
      router.refresh();
    } catch (e) {
      setValue(!next);
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="tree-toggle">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label="On the tree"
        className={`switch${value ? " on" : ""}`}
        disabled={busy || blocked}
        title={blocked ? "Approve this child first" : value ? "Remove from the tree" : "Put on the tree"}
        onClick={flip}
      >
        <i aria-hidden="true" />
      </button>
      <span className="tree-toggle-label">{value ? "Yes" : "No"}</span>
      {err && <span className="err" role="alert" style={{ display: "block" }}>{err}</span>}
    </span>
  );
}
