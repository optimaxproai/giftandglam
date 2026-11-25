"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import PasswordField from "@/components/PasswordField";

type Mode = "password" | "link" | "code" | "forgot";
const TABS: [Mode, string][] = [["password", "Password"], ["link", "Email link"], ["code", "Email code"]];

function friendly(m: string): string {
  if (/invalid login/i.test(m)) return "That email and password don't match. Try Forgot password, or sign in with an email link or code.";
  if (/rate|too many|seconds/i.test(m)) return "Too many tries. Wait a minute, then try again.";
  if (/token|expired|invalid/i.test(m)) return "That code didn't work or has expired. Send a new one.";
  return m;
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get("error");
    if (params.get("mode") === "forgot") setMode("forgot");
    if (error === "reset") {
      setMode("forgot");
      setMsg({ ok: false, t: "That reset link expired or was opened in a different browser. Request a new reset link and open it here." });
    } else if (error === "link")
      setMsg({ ok: false, t: "That link expired or was opened in a different browser. Use Email code or your password instead." });
  }, []);

  const sb = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
  const pick = (m: Mode) => { setMode(m); setMsg(null); setSent(false); setToken(""); };
  const fail = (t: string) => { setMsg({ ok: false, t: friendly(t) }); setBusy(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const addr = email.trim();
    if (mode === "password") {
      const { error } = await sb().auth.signInWithPassword({ email: addr, password });
      if (error) return fail(error.message);
      location.href = "/admin";
    } else if (mode === "link") {
      const { error } = await sb().auth.signInWithOtp({ email: addr, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) return fail(error.message);
      setSent(true); setBusy(false);
    } else if (mode === "code") {
      if (!sent) {
        const { error } = await sb().auth.signInWithOtp({ email: addr });
        if (error) return fail(error.message);
        setSent(true); setBusy(false);
      } else {
        const { error } = await sb().auth.verifyOtp({ email: addr, token: token.trim(), type: "email" });
        if (error) return fail(error.message);
        location.href = "/admin";
      }
    } else {
      const { error } = await sb().auth.resetPasswordForEmail(addr, { redirectTo: `${location.origin}/auth/callback` });
      if (error) return fail(error.message);
      setSent(true); setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "10vh auto" }}>
      <div className="panel">
        <div className="ribbon" />
        <h2 style={{ fontSize: "2rem", color: "var(--pine)", marginBottom: 4 }}>Organizer sign in</h2>
        <p className="muted" style={{ marginBottom: 14 }}>Only approved organizer emails can open the console.</p>
        {mode !== "forgot" && (
          <div className="tabs" role="tablist" style={{ margin: "0 0 16px" }}>
            {TABS.map(([m, label]) => (
              <a key={m} role="tab" aria-selected={mode === m} href="#" onClick={(e) => { e.preventDefault(); pick(m); }} style={mode === m ? { color: "var(--ink)", borderBottomColor: "var(--cran)" } : undefined}>{label}</a>
            ))}
          </div>
        )}
        {mode === "forgot" && <h3 style={{ marginBottom: 10 }}>Reset your password</h3>}

        <form onSubmit={submit}>
          <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
          {mode === "password" && <PasswordField id="pw" label="Password" value={password} onChange={setPassword} />}
          {mode === "code" && sent && (
            <div className="field"><label htmlFor="otp">6-digit code from the email</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" value={token} onChange={(e) => setToken(e.target.value)} maxLength={8} required /></div>
          )}
          {sent && mode === "link" && <div className="ok">Check your inbox and open the link <b>in this same browser</b>. On a different device or in the mail app&apos;s own browser? Use the Email code tab.</div>}
          {sent && mode === "forgot" && <div className="ok">If that email is an organizer account, a reset link is on its way. Open it in this browser.</div>}
          {sent && mode === "code" && <div className="ok">Code sent. It works on any device.</div>}
          {msg && <div className={msg.ok ? "ok" : "err"} role="alert">{msg.t}</div>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "One moment…" : mode === "password" ? "Sign in" : mode === "link" ? (sent ? "Send another link" : "Email me a link") : mode === "code" ? (sent ? "Sign in with code" : "Email me a code") : sent ? "Send again" : "Send reset link"}
          </button>
        </form>
        <p style={{ marginTop: 14, fontSize: ".88rem" }}>
          {mode === "forgot" ? (
            <a href="#" onClick={(e) => { e.preventDefault(); pick("password"); }}>← Back to sign in</a>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); pick("forgot"); }}>Forgot password, or never set one?</a>
          )}
        </p>
      </div>
    </div>
  );
}
