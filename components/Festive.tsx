import Link from "next/link";
import type { ReactNode } from "react";
import { DRIVE } from "@/lib/drive";
import { demoMode } from "@/lib/demo";
import { reviewMode } from "@/lib/mode";

/** Deterministic flakes (no randomness, so server and client markup match). */
export function Snow() {
  const flakes = Array.from({ length: 44 }, (_, i) => {
    const size = 3 + ((i * 7) % 5);
    return (
      <b
        key={i}
        style={{
          left: `${(i * 23) % 100}%`,
          width: size,
          height: size,
          animationDuration: `${7 + ((i * 5) % 9)}s`,
          animationDelay: `-${(i * 3) % 11}s`,
          ["--drift" as string]: `${((i % 5) - 2) * 14}px`,
        }}
      />
    );
  });
  return (
    <div className="snow" aria-hidden="true">
      {flakes}
    </div>
  );
}

export function Garland() {
  return (
    <div className="garland" aria-hidden="true">
      {Array.from({ length: 34 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export function Tree({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 34 38" aria-hidden="true">
      <path d="M17 2l2.3 4.7 5.1.7-3.7 3.6.9 5.1L17 13.6l-4.6 2.5.9-5.1-3.7-3.6 5.1-.7z" fill="#e6b440" />
      <path d="M17 12l9 10H8z" fill="#2f9a6c" />
      <path d="M17 19l11 11H6z" fill="#1f7a52" />
      <rect x="15" y="30" width="4" height="6" rx="1" fill="#b3123b" />
      <circle cx="15" cy="21" r="1.4" fill="#ff4d6d" />
      <circle cx="20" cy="27" r="1.4" fill="#e6b440" />
    </svg>
  );
}

export function SiteShell({ children, hero, admin = false }: { children: ReactNode; hero?: ReactNode; admin?: boolean }) {
  return (
    <>
      {reviewMode() ? (
        <div className="demo">Review build: every name, contact and answer here is fictional. Nothing is saved to a real database.</div>
      ) : (
        demoMode() && <div className="demo">Demo mode: 60 fictional children, read-only. Not connected to a database.</div>
      )}
      <div className="sky">
        <Snow />
        <div className="sky-in" style={admin ? { paddingBottom: 18 } : undefined}>
          <Garland />
          <nav className="nav" aria-label="Main">
            <Link href={admin ? "/admin" : "/"} className="logo">
              <Tree />
              <span>
                Virtual Angel Tree
                <small>{admin ? "Organizer console" : DRIVE.name}</small>
              </span>
            </Link>
            <div className="nav-links">
              {admin ? (
                <>
                  <Link href="/admin">Overview</Link>
                  <Link href="/admin/households">Families</Link>
                  <Link href="/admin/children">Children &amp; Gifts</Link>
                  <Link href="/admin/sponsors">Sponsors &amp; Donations</Link>
                  <div className="organizer-tools-group">
                    <details className="organizer-tools">
                      <summary>Organizer Tools</summary>
                      <div className="organizer-tools-links">
                        <Link href="/admin/import">Import Applications</Link>
                        <Link href="/admin/print">Print Gift Labels</Link>
                      </div>
                    </details>
                    <Link href="/admin/account">Account</Link>
                  </div>
                  <Link href="/">View tree</Link>
                </>
              ) : (
                <>
                  <Link href="/">The tree</Link>
                  <Link href="/mine">My Angels</Link>
                  <Link href="/admin">Organizers</Link>
                </>
              )}
            </div>
          </nav>
          {hero}
        </div>
      </div>
      <div className="wrap">
        {children}
        <Footer />
      </div>
    </>
  );
}

export function Footer() {
  return <p className="foot">A community project built with OptiMaxProAI. Every gift is returned unwrapped by {DRIVE.returnByLabel}.</p>;
}
