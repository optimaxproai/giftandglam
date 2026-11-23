"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordField from "../PasswordField";

export default function AccountForm() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ ok: false, t: "Use at least 8 characters." });
    if (pw !== pw2) return setMsg({ ok: false, t: "The two passwords don't match." });
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return setMsg({ ok: false, t: error.message });
    setPw(""); setPw2("");
    setMsg({ ok: true, t: "Password saved. You can now sign in with it." });
  }

  return (
    <form className="panel" onSubmit={save}>
      <h3 style={{ marginBottom: 10 }}>Set or change your password</h3>
      <PasswordField id="ap1" label="New password" value={pw} onChange={setPw} autoComplete="new-password" hint="At least 8 characters." />
      <PasswordField id="ap2" label="Type it again" value={pw2} onChange={setPw2} autoComplete="new-password" />
      {msg && <div className={msg.ok ? "ok" : "err"} role="status">{msg.t}</div>}
      <button className="btn" type="submit">Save password</button>
    </form>
  );
}
