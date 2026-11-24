"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SponsorContact } from "@/lib/sponsorContacts";

function ContactForm({ contact, close }: { contact: SponsorContact | null; close: () => void }) {
  const router = useRouter();
  const [links, setLinks] = useState(contact?.links ?? []);
  const [removeFlyer, setRemoveFlyer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sponsors", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) setError(result.error || "Couldn't save sponsor.");
      else { router.refresh(); close(); }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="panel private" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 14 }}>{contact ? "Edit sponsor" : "Add sponsor"}</h3>
      <input type="hidden" name="id" value={contact?.id ?? ""} />
      <div className="two aligned-fields">
        <label className="field"><span className="lbl">Sponsor or contact name</span><input name="name" required maxLength={160} defaultValue={contact?.name ?? ""} /></label>
        <label className="field"><span className="lbl">Business / organization</span><input name="organization" maxLength={160} defaultValue={contact?.organization ?? ""} /></label>
        <label className="field"><span className="lbl">Email</span><input name="email" type="email" maxLength={200} defaultValue={contact?.email ?? ""} /></label>
        <label className="field"><span className="lbl">Phone</span><input name="phone" type="tel" maxLength={60} defaultValue={contact?.phone ?? ""} /></label>
      </div>
      <div className="field">
        <span className="lbl">Website, social media or other links</span>
        {links.map((link, index) => <div className="item-row" key={index}><input type="url" name="links" aria-label={`Sponsor link ${index + 1}`} placeholder="https://..." value={link} onChange={(e) => setLinks((current) => current.map((value, i) => i === index ? e.target.value : value))} /><button type="button" className="btn ghost sm" onClick={() => setLinks((current) => current.filter((_, i) => i !== index))}>Remove</button></div>)}
        <div><button type="button" className="btn ghost sm" disabled={links.length >= 10} onClick={() => setLinks([...links, ""])}>+ Add link</button></div>
      </div>
      <label className="field"><span className="lbl">Notes (private)</span><textarea name="notes" maxLength={2000} defaultValue={contact?.notes ?? ""} placeholder="Donation commitments, preferred contact method or follow-up details" /></label>
      <label className="field"><span className="lbl">Sponsor flyer (optional)</span><input type="file" name="flyer" accept="application/pdf,image/jpeg,image/png" /><small>PDF, JPG or PNG, up to 2 MB. Organizer access only.</small></label>
      {contact?.flyer_name && <label className="check"><input type="checkbox" name="removeFlyer" value="true" checked={removeFlyer} onChange={(e) => setRemoveFlyer(e.target.checked)} />Remove the existing flyer ({contact.flyer_name})</label>}
      {error && <div className="err" role="alert">{error}</div>}
      <div className="acts"><button type="submit" className="btn" disabled={busy}>{busy ? "Saving…" : "Save sponsor"}</button><button className="btn ghost" type="button" disabled={busy} onClick={close}>Cancel</button></div>
    </form>
  );
}

export default function SponsorContacts({ contacts }: { contacts: SponsorContact[] }) {
  const [entry, setEntry] = useState<SponsorContact | "new" | null>(null);
  return (
    <section style={{ marginBottom: 24 }}>
      <div className="page-h">
        <h3>Sponsor contacts</h3>
        <button className="btn" onClick={() => setEntry("new")}>+ Add sponsor</button>
      </div>
      {entry && <ContactForm key={entry === "new" ? "new" : entry.id} contact={entry === "new" ? null : entry} close={() => setEntry(null)} />}
      {contacts.length === 0 ? <div className="panel muted">Add an individual or business sponsor to record their details and flyers.</div> : (
        <div className="tw"><table>
          <thead><tr><th>Name / organization</th><th>Contact</th><th>Links</th><th>Notes</th><th>Flyer</th><th></th></tr></thead>
          <tbody>{contacts.map((contact) => <tr key={contact.id}>
            <td><b>{contact.name}</b><br /><span className="muted">{contact.organization}</span></td>
            <td>{contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}<br />{contact.phone}</td>
            <td>{contact.links.map((link, i) => <div key={i}><a href={link} target="_blank" rel="noopener noreferrer">{new URL(link).hostname}</a></div>)}</td>
            <td style={{ maxWidth: 240, whiteSpace: "pre-wrap" }}>{contact.notes || "—"}</td>
            <td>{contact.flyer_name ? <a href={`/api/admin/sponsors?id=${contact.id}`}>Download flyer</a> : "—"}</td>
            <td><button type="button" className="btn ghost sm" onClick={() => setEntry(contact)}>Edit</button></td>
          </tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}
