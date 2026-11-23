"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordField from "@/components/PasswordField";

/** Landing page for the password-reset email: choose a new password. */
export default function Reset() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [state, setState] = useState<"checking" | "ready" | "nolink" | "done">("checking");
  const [err, setErr] = useState("");
  const sb = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

  useEffect(() => {
    sb().auth.getUser().then(({ data }) => setState(data.user ? "ready" : "nolink"));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    const { error } = await sb().auth.updateUser({ password: pw });
    if (error) return setErr(error.message);
    setState("done");
    setTimeout(() => (location.href = "/admin"), 1200);
  }

  return (
    <div style={{ maxWidth: 440, margin: "10vh auto" }}>
      <div className="panel">
        <div className="ribbon" />
        <h2 style={{ fontSize: "2rem", color: "var(--pine)", marginBottom: 10 }}>Choose a new password</h2>
        {state === "checking" && <p className="muted">One moment…</p>}
        {state === "nolink" && (
          <>
            <div className="err">This reset link has expired or was opened in a different browser.</div>
            <a className="btn" href="/admin/login">Request a new one</a>
          </>
        )}
        {state === "done" && <div className="ok">Password saved. Taking you to the console…</div>}
        {state === "ready" && (
          <form onSubmit={save}>
            <PasswordField id="np" label="New password" value={pw} onChange={setPw} autoComplete="new-password" hint="At least 8 characters. Tap the eye to check what you typed." />
            <PasswordField id="np2" label="Type it again" value={pw2} onChange={setPw2} autoComplete="new-password" />
            {err && <div className="err" role="alert">{err}</div>}
            <button className="btn" type="submit">Save password</button>
          </form>
        )}
      </div>
    </div>
  );
}
