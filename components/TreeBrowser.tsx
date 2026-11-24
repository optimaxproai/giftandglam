"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Ornament } from "./Ornament";
import type { PublicChild } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");

export default function TreeBrowser({ kids }: { kids: PublicChild[] }) {
  const [q, setQ] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [avail, setAvail] = useState(true);

  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return kids.filter((c) => {
      if (avail && !c.available) return false;
      if (gender && c.gender !== gender) return false;
      if (age) {
        const [lo, hi] = age.split("-").map(Number);
        if (c.age == null || c.age < lo || c.age > hi) return false;
      }
      if (s && ![c.firstName, ...c.wants, ...c.needs, ...c.faves].join(" ").toLowerCase().includes(s)) return false;
      return true;
    });
  }, [kids, q, age, gender, avail]);

  return (
    <>
      <div className="toolbar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wishes: Lego, hoodie, Taylor Swift" aria-label="Search wishes" />
        <select value={age} onChange={(e) => setAge(e.target.value)} aria-label="Age">
          <option value="">All ages</option>
          <option value="0-8">Up to 8</option>
          <option value="9-12">9 to 12</option>
          <option value="13-21">13 and up</option>
        </select>
        <select value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Gender">
          <option value="">Girls and boys</option>
          <option>Girl</option>
          <option>Boy</option>
        </select>
        <label>
          <input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} /> Available only
        </label>
      </div>
      {kids.length === 0 ? (
        <div className="empty">
          <h3>The tree is being decorated</h3>
          <p>Angels will appear here soon. Check back shortly.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>No angels match</h3>
          <p>Try clearing a filter or turning off Available only.</p>
        </div>
      ) : (
        <div className="grid">
          {list.map((c) => (
            <Link key={c.id} href={`/angel/${c.id}`} className={`orn${c.available ? "" : " taken"}`}>
              <Ornament id={c.id} name="★" photo={false} />
              <div className="no" style={{ textAlign: "center" }}>
                Angel · <span className={`pill ${c.available ? "available" : "claimed"}`}>{c.available ? "Available" : "Sponsored"}</span>
              </div>
              <h3>
                {c.firstName}
                <span>
                  {c.age != null ? `${c.age} · ` : ""}
                  {c.gender || ""}
                </span>
              </h3>
              <ul>
                {c.wants.slice(0, 3).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <div className="chips">
                {c.gifts.map((gift, index) => <span key={index} className="chip gc">+ ${gift.amount} {gift.store} gift card</span>)}
                {c.siblings.length > 0 && <span className="chip sib">+{c.siblings.length} sibling{c.siblings.length > 1 ? "s" : ""}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
