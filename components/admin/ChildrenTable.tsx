"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { Ornament } from "@/components/Ornament";
import { GiftItemCells, useGiftEdit } from "./GiftItemCells";
import { giftCounts, giftLabel, GIFT_KIND, type GiftItem } from "@/lib/giftItems";
import StatusButtons from "@/components/admin/StatusButtons";
import TreeToggle from "@/components/admin/TreeToggle";
import { DECISION_LABEL, DECISION_PILL } from "@/lib/campaign/rules";
import { STATUS_LABEL, type Decision, type Status } from "@/lib/types";

type Row = {
  id: string;
  name: string;
  firstName: string;
  photo: boolean;
  code: string | null;
  age: number | null;
  gender: string | null;
  familyId: string;
  parent: string;
  phone: string;
  siblings: number;
  decision: Decision;
  reason: string | null;
  onTree: boolean;
  status: Status;
  sponsor: string;
  giftCardStatus: string;
};
type Operation = "approve" | "publish";
type Result = { childId: string; error?: string };

const DECISIONS = Object.entries(DECISION_LABEL);
const CAN_APPROVE = new Set<Decision>(["pending", "needs_info"]);
const STATUS_FILTERS: [string, string][] = [
  ["available", "Needs a sponsor"],
  ["sponsored", "Sponsored"],
  ["claimed", "Shopping underway"],
  ["purchased", "Gifts bought"],
  ["received", "Gifts received"],
  ["given", "Gifts given out"],
  ["giftcard", "Gift card pending"],
];

function matchesStatus(row: Row, status: string) {
  if (!status) return true;
  if (status === "giftcard") return row.giftCardStatus === "pledged";
  if (!row.onTree) return false;
  if (status === "sponsored") return row.status !== "available";
  if (status === "received") return row.status === "returned" || row.status === "given";
  return row.status === status;
}

export default function ChildrenTable({ rows, gifts, initialFilter = "" }: { rows: Row[]; gifts: GiftItem[]; initialFilter?: string }) {
  const router = useRouter();
  const giftEdit = useGiftEdit();
  const [expanded, setExpanded] = useState("");
  const [giftFilter, setGiftFilter] = useState("");
  const [kind, setKind] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [archived, setArchived] = useState(false);
  const items = new Map<string, GiftItem[]>();
  for (const gift of gifts) {
    const group = items.get(gift.child_id);
    if (group) group.push(gift);
    else items.set(gift.child_id, [gift]);
  }
  function matchesGift(gift: GiftItem) {
    if (!gift.active && !archived || kind && gift.kind !== kind) return false;
    if (giftFilter === "purchased") return !!gift.purchase_source;
    if (giftFilter === "unbought") return !gift.purchase_source;
    if (giftFilter === "received") return gift.received;
    if (giftFilter === "outstanding") return !gift.received;
    if (giftFilter === "assigned") return gift.donation_assigned;
    return true;
  }
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState(initialFilter === "review" ? "pending" : DECISIONS.some(([value]) => value === initialFilter) ? initialFilter : "");
  const [tree, setTree] = useState(initialFilter === "tree" ? "yes" : initialFilter === "approved" ? "no" : "");
  const [status, setStatus] = useState(STATUS_FILTERS.some(([value]) => value === initialFilter) ? initialFilter : "");
  const [selected, setSelected] = useState(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [summary, setSummary] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const selectAll = useRef<HTMLInputElement>(null);

  const search = query.trim().toLowerCase();
  const [minAge, maxAge] = age.split("-").map(Number);
  const visible = rows.filter((row) =>
    (!decision || row.decision === decision) &&
    (!tree || row.onTree === (tree === "yes")) &&
    matchesStatus(row, status) &&
    (!age || row.age !== null && row.age >= minAge && row.age <= maxAge) &&
    (!gender || row.gender === gender) &&
    ((!giftFilter && !kind) || items.get(row.id)?.some(matchesGift)) &&
    (!search || [row.name, row.code, row.parent, row.sponsor, ...(items.get(row.id) ?? []).filter(matchesGift).map(giftLabel)].some((value) => value?.toLowerCase().includes(search))),
  );
  const totals = giftCounts(visible.flatMap((row) => (items.get(row.id) ?? []).filter(matchesGift)));
  const checked = visible.filter((row) => selected.has(row.id));
  const approvable = checked.filter((row) => CAN_APPROVE.has(row.decision));
  const publishable = checked.filter((row) => row.decision === "approved" && !row.onTree && row.code);
  const allChecked = visible.length > 0 && checked.length === visible.length;
  const partial = checked.length > 0 && !allChecked;
  const disabled = busy || refreshing;

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = partial;
  }, [partial, visible.length]);

  function changeFilter(set: (value: string) => void, value: string) {
    set(value);
    setSelected(new Set());
  }

  async function run(operation: Operation) {
    const targets = operation === "approve" ? approvable : publishable;
    if (disabled || !targets.length) return;
    if (operation === "publish" && !window.confirm(`Publish ${targets.length} selected ${targets.length === 1 ? "angel" : "angels"} to the public tree?`)) return;

    const byId = new Map(targets.map((row) => [row.id, row]));
    const results: Result[] = [];
    setBusy(true);
    setSummary("");
    setErrors([]);
    try {
      for (let i = 0; i < targets.length; i += 25) {
        const childIds = targets.slice(i, i + 25).map((row) => row.id);
        const response = await fetch("/api/admin/household", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "bulk", operation, childIds }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "The request could not be completed.");
        results.push(...body.results);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The request could not be completed.";
      setErrors([`Some changes could not be confirmed. ${message}`]);
    } finally {
      const succeeded = new Set(results.filter((result) => !result.error).map((result) => result.childId));
      const failures = results.flatMap(({ childId, error }) => error ? [`${byId.get(childId)?.name}: ${error}`] : []);
      const skipped = checked.length - targets.length;
      setErrors((current) => [...current, ...failures]);
      setSummary(`${succeeded.size} ${operation === "approve" ? "approved" : "published"}.${skipped ? ` ${skipped} selected ${skipped === 1 ? "child was" : "children were"} ineligible for this action.` : ""}`);
      if (operation === "publish") {
        setSelected((current) => new Set([...current].filter((id) => !succeeded.has(id))));
      }
      startRefresh(() => router.refresh());
      setBusy(false);
    }
  }

  return (
    <>
      <div className="kpis">
        <div className="kpi"><small>Matching gift requests</small><b>{totals.total}</b></div>
        {([["purchased", "Purchased", totals.purchased], ["unbought", "Not purchased", totals.total - totals.purchased], ["received", "Received", totals.received], ["assigned", "Donation assigned", totals.covered]] as const).map(([value, label, count]) =>
          <button key={value} type="button" className="kpi" aria-pressed={giftFilter === value} onClick={() => changeFilter(setGiftFilter, giftFilter === value ? "" : value)}><small>{label}</small><b>{count}</b></button>
        )}
      </div>
      <div className="toolbar">
        <input type="search" aria-label="Search children" placeholder="Child, angel code, family, sponsor or gift" value={query} disabled={disabled} onChange={(e) => changeFilter(setQuery, e.target.value)} />
        <select aria-label="Decision" value={decision} disabled={disabled} onChange={(e) => changeFilter(setDecision, e.target.value)}>
          <option value="">All decisions</option>
          {DECISIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="On The Tree" value={tree} disabled={disabled} onChange={(e) => changeFilter(setTree, e.target.value)}>
          <option value="">Any tree status</option>
          <option value="yes">On the tree</option>
          <option value="no">Off the tree</option>
        </select>
        <select aria-label="Sponsorship" value={status} disabled={disabled} onChange={(e) => changeFilter(setStatus, e.target.value)}>
          <option value="">All sponsorship statuses</option>
          {STATUS_FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select aria-label="Gift status" value={giftFilter} onChange={(e) => changeFilter(setGiftFilter, e.target.value)}>
          <option value="">Any gift status</option>
          <option value="purchased">Purchased</option><option value="unbought">Not purchased</option>
          <option value="received">Received</option><option value="outstanding">Not received</option><option value="assigned">Donation assigned</option>
        </select>
        <button type="button" className="btn ghost sm" disabled={disabled} onClick={() => {
          setQuery(""); setDecision(""); setTree(""); setStatus(""); setGiftFilter(""); setKind(""); setAge(""); setGender(""); setArchived(false); setSelected(new Set());
        }}>Clear filters</button>
      </div>
      <details>
        <summary>More filters</summary>
        <div className="toolbar">
          <select aria-label="Age" value={age} onChange={(e) => changeFilter(setAge, e.target.value)}>
            <option value="">All ages</option><option value="0-8">Up to 8</option><option value="9-12">9 to 12</option><option value="13-120">13 and up</option>
          </select>
          <select aria-label="Gender" value={gender} onChange={(e) => changeFilter(setGender, e.target.value)}>
            <option value="">All genders</option><option>Girl</option><option>Boy</option><option>Other</option>
          </select>
          <select aria-label="Gift category" value={kind} onChange={(e) => changeFilter(setKind, e.target.value)}>
            <option value="">All gift categories</option>
            {Object.entries(GIFT_KIND).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label><input type="checkbox" checked={archived} onChange={(e) => { setArchived(e.target.checked); setSelected(new Set()); }} /> Show removed requests</label>
        </div>
      </details>
      {giftEdit.err && <p className="err" role="alert">{giftEdit.err}</p>}
      <div className="acts children-bulk" aria-label="Bulk actions" role="group">
        <span className="muted">{visible.length} of {rows.length} children · {checked.length} selected</span>
        <button type="button" className="btn sm green" disabled={disabled || !approvable.length} onClick={() => run("approve")}>
          Approve selected{approvable.length > 0 && ` (${approvable.length})`}
        </button>
        <button type="button" className="btn sm" disabled={disabled || !publishable.length} onClick={() => run("publish")}>
          Publish selected{publishable.length > 0 && ` (${publishable.length})`}
        </button>
      </div>
      <p role="status" className="muted">{disabled ? "Saving changes…" : summary}</p>
      {errors.length > 0 && <ul role="alert" className="err list">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
      {visible.length === 0 ? (
        <div className="empty">
          <h3>{rows.length ? "No matching children" : "No children yet"}</h3>
          <p>{rows.length ? "Try changing the search or clearing the filters." : "Add a family or import an email to add children."}</p>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col"><input ref={selectAll} type="checkbox" aria-label="Select all visible children" checked={allChecked} disabled={disabled} onChange={(e) => setSelected(new Set(e.target.checked ? visible.map((row) => row.id) : []))} /></th>
                <th scope="col">Child (private)</th><th scope="col">Angel Code</th><th scope="col">Family</th>
                <th scope="col">Decision</th><th scope="col">On The Tree</th><th scope="col">Sponsorship</th><th scope="col">Gift progress</th><th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const requests = items.get(row.id) ?? [];
                const counts = giftCounts(requests);
                const shown = requests.filter(matchesGift);
                return <Fragment key={row.id}>
                <tr>
                  <td><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.has(row.id)} disabled={disabled} onChange={(e) => {
                    const totals = giftCounts(visible.flatMap((row) => (items.get(row.id) ?? []).filter(matchesGift)));
  const checked = e.target.checked;
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.add(row.id);
                      else next.delete(row.id);
                      return next;
                    });
                  }} /></td>
                  <td>
                    <Link href={`/admin/children/${row.id}`} className="child-row-link">
                      <span className="child-row-ornament"><Ornament id={row.id} name={row.firstName} photo={row.photo} /></span>
                      <span><b>{row.name}</b><br /><span className="muted">{row.age ?? "Age unknown"}{row.gender && ` · ${row.gender}`}</span></span>
                    </Link>
                  </td>
                  <td className="numeric-text">{row.code || "—"}</td>
                  <td>
                    <Link href={`/admin/households/${row.familyId}`}>{row.parent || "View family"}</Link><br />
                    <span className="muted">{[row.phone, row.siblings ? `${row.siblings} sibling${row.siblings === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td>
                    <span className={`pill ${DECISION_PILL[row.decision]}`}>{DECISION_LABEL[row.decision]}</span>
                    {row.reason && <div className="muted child-decision-reason">{row.reason}</div>}
                  </td>
                  <td><TreeToggle childId={row.id} on={row.onTree} canPublish={row.decision === "approved" && !!row.code} /></td>
                  <td>{row.onTree ? <><span className={`pill ${row.status}`}>{STATUS_LABEL[row.status]}</span><br /><span className="muted">{row.sponsor || "Sponsor TBD"}</span></> : <span className="muted">{row.sponsor || "—"}</span>}</td>
                  <td>{counts.purchased}/{counts.total} purchased<br /><span className="muted">{counts.received}/{counts.total} received</span></td>
                  <td><div className="acts">
                    <button type="button" className="btn sm ghost" aria-expanded={expanded === row.id} onClick={() => setExpanded(expanded === row.id ? "" : row.id)}>{expanded === row.id ? "Hide gifts" : "View gifts"}</button>
                    {row.onTree ?
                    <StatusButtons id={row.id} status={row.status} gift={status === "giftcard" ? row.giftCardStatus : "none"} compact /> :
                    <Link className="btn sm ghost" href={`/admin/households/${row.familyId}`}>{row.decision === "approved" ? "Manage" : "Decide"}</Link>}
                  </div></td>
                </tr>
                {expanded === row.id && <tr className="child-gift-detail"><td colSpan={9}>
                  <h3>{row.name} · Gift checklist</h3>
                  <div className="acts">
                    <Link href={`/admin/children/${row.id}`} className="btn sm ghost">Open child record</Link>
                    <Link href={`/admin/households/${row.familyId}`} className="btn sm ghost">View family</Link>
                  </div>
                  {shown.length ? <table>
                    <thead><tr><th>Item</th><th>Category</th><th>Purchase source</th><th>Received</th><th>Donation assigned</th></tr></thead>
                    <tbody>{shown.map((gift) => <tr key={gift.id}><GiftItemCells item={gift} busy={giftEdit.busy} action={giftEdit.action} /></tr>)}</tbody>
                  </table> : <p className="muted">No matching gift requests.</p>}
                </td></tr>}
                </Fragment>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
