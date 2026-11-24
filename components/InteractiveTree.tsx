"use client";

import {useRouter} from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { PublicChild } from "@/lib/types";
import { layoutAngelTree, treeColor, treeMatches, type TreeFilters } from "@/lib/treeLayout";
import styles from "./InteractiveTree.module.css";
import Celebration from "./Celebration";
import ClaimForm from "./ClaimForm";

const fullTree: TreeFilters = { query: "", age: "", gender: "", availableOnly: false };

function GiftList({ title, items }: { title: string; items: string[] }) {
  return <div><h4 className={styles.listTitle}>{title}</h4>{items.length ? <ul className="list">{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="muted">Not listed</p>}</div>;
}

function TreeDetail({ child, hidden,dropOff,onClaim }: { child: PublicChild | undefined; hidden: boolean;dropOff:string;onClaim:()=>void }) {
  const [adopting,setAdopting]=useState(false);
  if (!child) return <><h3>Find your angel</h3><p className="muted">Select any ornament to see the angel’s age, sizes, wants, needs and interests. Then choose to sponsor them.</p></>;
  const gifts = (child as PublicChild & { gifts?: { store: string; amount: number }[] }).gifts ?? (child.gift ? [child.gift] : []);
  return <>
    <div className={styles.detailHead}>
      <div className={`${styles.detailBall} ${styles[treeColor(child, true)]}`} aria-hidden="true">★</div>
      <div><h3>{child.code}</h3><p className="muted">{[child.age === null ? "Age not stated" : `${child.age} years old`, child.gender || "Gender not stated"].join(" · ")}</p><span className={`pill ${child.available ? "available" : "claimed"}`}>{child.available ? "Available" : "Sponsored"}</span></div>
    </div>
    {hidden && <p className="muted">This angel is outside your current filters. Select Show full tree to see their ornament again.</p>}
    <div className="facts">
      {[["Shirt", child.tops], ["Pants", child.bottoms], ["Shoes", child.shoes], ["Favorite color", child.favColor]].filter(([, size]) => !!size).map(([label, size]) => <div className="fact" key={label}><small>{label}</small>{size}</div>)}
    </div>
    <GiftList title="Wants" items={child.wants} />
    <GiftList title="Needs" items={child.needs} />
    <GiftList title="Interests" items={child.faves} />
    {gifts.length > 0 && <GiftList title="Optional gift cards" items={gifts.map((g) => `$${g.amount} ${g.store}`)} />}
    {child.siblings.length > 0 && <p className="muted">{child.siblings.length} sibling{child.siblings.length === 1 ? " is" : "s are"} also on the tree. See the full angel page for details.</p>}
    {adopting?<div className={styles.claimSection}><ClaimForm childId={child.id} name={child.code} gifts={child.gifts} child={child} dropOff={dropOff} onClaim={onClaim}/></div>:child.available?<button type="button" className="btn" onClick={()=>setAdopting(true)}>Adopt {child.code}</button>:<p className="ok">This angel has a sponsor. Thank you for helping make Christmas bright!</p>}
  </>;
}

export default function InteractiveTree({ kids,dropOff }: { kids: PublicChild[];dropOff:string }) {
  const router=useRouter();
  const [filters, setFilters] = useState<TreeFilters>(fullTree);
  const [selected, setSelected] = useState<string | null>(null);
  const [burst,setBurst]=useState(0);
  const [claimed,setClaimed]=useState<string[]>([]);
  const detail = useRef<HTMLElement>(null);
  const ordered = useMemo(() => kids.map(c=>claimed.includes(c.id)?{...c,available:false,status:"claimed" as const}:c).sort((a, b) => a.no - b.no || a.id.localeCompare(b.id)), [kids,claimed]);
  const layout = useMemo(() => layoutAngelTree(ordered.length), [ordered.length]);
  const shown = useMemo(() => new Set(ordered.filter((child) => treeMatches(child, filters)).map((child) => child.id)), [ordered, filters]);
  const child = ordered.find((c) => c.id === selected);
  const available = ordered.filter((c) => c.available).length;

  function select(id: string) {
    setSelected(id);
    setBurst(n=>n+1);
    if (window.matchMedia("(max-width: 760px)").matches) detail.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return <section className={styles.section} aria-label="Virtual Angel Tree">
    <div className={`toolbar ${styles.filters}`}>
      <input type="search" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Search angel codes, wishes, needs or interests" aria-label="Search angels" />
      <select value={filters.age} onChange={(e) => setFilters({ ...filters, age: e.target.value })} aria-label="Age range"><option value="">All ages</option><option value="0-8">Up to 8</option><option value="9-12">9 to 12</option><option value="13-">13 and up</option></select>
      <select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })} aria-label="Gender"><option value="">All genders</option><option value="girl">Girls</option><option value="boy">Boys</option><option value="other">Other / not stated</option></select>
      <label><input type="checkbox" checked={filters.availableOnly} onChange={(e) => setFilters({ ...filters, availableOnly: e.target.checked })} /> Available only</label>
      <button type="button" className="btn ghost sm" onClick={() => setFilters(fullTree)}>Show full tree</button>
    </div>
    <div className={styles.counts} role="status"><b>{shown.size} of {kids.length} angels shown</b><span className="muted">{available} available · {kids.length - available} sponsored</span></div>
    <div className={styles.legend} aria-label="Ornament color legend">
      <span><i className={styles.boy} /> Boys</span><span><i className={styles.girl} /> Girls</span><span><i className={styles.other} /> Other / not stated</span><span><i className={styles.gold} /> Selected or sponsored</span>
    </div>
    <div className={styles.split}>
      <div className={styles.scene}>
        <h3>Our Angel Tree</h3><p className={styles.subtitle}>{kids.length ? "Choose an ornament to make Christmas bright." : "The tree is being decorated"}</p>
        <div className={styles.viewport} role="region" aria-label="Tree ornaments (scroll to see all if needed)" tabIndex={0}>
          <div className={`${styles.tree} ${styles.cinematic}`} style={{ minWidth: layout.minWidth, minHeight: Math.max(540,layout.minHeight) }}>
            {Array.from({length:20},(_,i)=><i className={styles.flake} key={i} aria-hidden="true" style={{left:`${i*47%100}%`,animationDuration:`${10+i%6}s`,animationDelay:`-${i*2%15}s`,width:2+i%4,height:2+i%4}}/>)}
            {ordered.map((c, i) => {
              if (!shown.has(c.id)) return null;
              const point = layout.points[i];
              const active = c.id === selected;
              const label = `${c.code}, ${c.age === null ? "age not stated" : `${c.age} years old`}, ${c.gender || "gender not stated"}, ${c.available ? "available" : "sponsored"}`;
              const [prefix, ...rest] = c.code.split("-");
              return <button key={c.id} type="button" className={`${styles.ornament} ${styles[treeColor(c, active)]} ${active ? styles.active : ""}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-pressed={active} aria-label={label} title={label} aria-controls="selected-angel" onClick={() => select(c.id)}><span>{rest.length ? <>{prefix}<br />{rest.join("-")}</> : c.code}</span>{active&&burst>0&&c.available&&<Celebration key={burst} mode="sparkles"/>}</button>;
            })}
            {kids.length > 0 && shown.size === 0 && <div className={styles.emptyOverlay}>No angels match your filters. <button type="button" onClick={() => setFilters(fullTree)}>Show full tree</button></div>}
          </div>
        </div>
        <p className={styles.treeNote} aria-live="polite">{child?`✦ ${child.code} ${child.available?"selected! See their wish list below.":"has a sponsor. Thank you!"}`:kids.length ? `${shown.size} ornament${shown.size === 1 ? "" : "s"} shown · ${kids.length} angels in the full tree` : "Angels will appear here soon. Check back shortly."}</p>
      </div>
      <aside id="selected-angel" ref={detail} aria-label="Selected angel details" className={`panel ${styles.detail}`}><TreeDetail key={child?.id||"none"} child={child} hidden={!!child && !shown.has(child.id)} dropOff={dropOff} onClaim={()=>{if(child){setClaimed(prev=>prev.includes(child.id)?prev:[...prev,child.id]);setFilters(fullTree);router.refresh();}}}/></aside>
    </div>
  </section>;
}
