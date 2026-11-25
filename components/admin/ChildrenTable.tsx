"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Ornament } from "@/components/Ornament";
import StatusButtons from "@/components/admin/StatusButtons";
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

export default function ChildrenTable({ rows, initialFilter = "" }: { rows: Row[]; initialFilter?: string }) {
  const router = useRouter();
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
  const visible = rows.filter((row) =>
    (!decision || row.decision === decision) &&
    (!tree || row.onTree === (tree === "yes")) &&
    matchesStatus(row, status) &&
    (!search || [row.name, row.code, row.parent, row.sponsor].some((value) => value?.toLowerCase().includes(search))),
  );
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
      <div className="toolbar">
        <input type="search" aria-label="Search children" placeholder="Child name, angel code, parent or sponsor" value={query} disabled={disabled} onChange={(e) => changeFilter(setQuery, e.target.value)} />
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
        <button type="button" className="btn ghost sm" disabled={disabled} onClick={() => {
          setQuery(""); setDecision(""); setTree(""); setStatus(""); setSelected(new Set());
        }}>Clear filters</button>
      </div>
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
          <p>{rows.length ? "Try changing the search or clearing the filters." : "Enter a household or import an email to add children."}</p>
        </div>
      ) : (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th scope="col"><input ref={selectAll} type="checkbox" aria-label="Select all visible children" checked={allChecked} disabled={disabled} onChange={(e) => setSelected(new Set(e.target.checked ? visible.map((row) => row.id) : []))} /></th>
                <th scope="col">Child (private)</th><th scope="col">Angel Code</th><th scope="col">Family</th>
                <th scope="col">Decision</th><th scope="col">On The Tree</th><th scope="col">Sponsorship</th><th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.has(row.id)} disabled={disabled} onChange={(e) => {
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
                    <Link href={`/admin/households/${row.familyId}`}>{row.parent || "View household"}</Link><br />
                    <span className="muted">{[row.phone, row.siblings ? `${row.siblings} sibling${row.siblings === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td>
                    <span className={`pill ${DECISION_PILL[row.decision]}`}>{DECISION_LABEL[row.decision]}</span>
                    {row.reason && <div className="muted child-decision-reason">{row.reason}</div>}
                  </td>
                  <td><span className={`pill ${row.onTree ? "available" : "neutral"}`}>{row.onTree ? "Yes" : "No"}</span></td>
                  <td>{row.onTree ? <><span className={`pill ${row.status}`}>{STATUS_LABEL[row.status]}</span><br /><span className="muted">{row.sponsor || "No sponsor yet"}</span></> : <span className="muted">{row.sponsor || "—"}</span>}</td>
                  <td>{row.onTree ?
                    <StatusButtons id={row.id} status={row.status} gift={status === "giftcard" ? row.giftCardStatus : "none"} compact /> :
                    <Link className="btn sm ghost" href={`/admin/households/${row.familyId}`}>{row.decision === "approved" ? "Manage" : "Decide"}</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
