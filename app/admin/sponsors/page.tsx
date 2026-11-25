import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import { requireAdmin } from "@/lib/auth";
import { allChildren } from "@/lib/data";
import { DRIVE, daysUntil } from "@/lib/drive";
import { pad } from "@/lib/child";
import { STATUS_LABEL } from "@/lib/types";
import SponsorContacts from "@/components/admin/SponsorContacts";
import { getCampaign } from "@/lib/campaign";
import DonationManagement from "@/components/admin/DonationManagement";
import SponsorCells from "@/components/admin/SponsorCells";
import { displaySponsorName, donorNames } from "@/lib/sponsorDisplay";

export const dynamic = "force-dynamic";

export default async function SponsorsAndDonations({ searchParams }: { searchParams: { tab?: string } }) {
  await requireAdmin();
  const donations = searchParams.tab === "donations";

  return (
    <SiteShell admin>
      <div className="page-h"><h2>Sponsors &amp; Donations</h2></div>
      <nav className="tabs" aria-label="Sponsors and donations views">
        <Link href="/admin/sponsors" className={donations ? "" : "active"} aria-current={donations ? undefined : "page"}>Sponsors</Link>
        <Link href="/admin/sponsors?tab=donations" className={donations ? "active" : ""} aria-current={donations ? "page" : undefined}>Donations</Link>
      </nav>
      {donations ? <DonationsPanel /> : <SponsorsPanel />}
    </SiteShell>
  );
}

async function DonationsPanel() {
  const offers = await (await getCampaign()).store.listDonationOffers();
  return (
    <>
      <h3>Donations &amp; Volunteers</h3>
      <p className="muted">Review contribution preferences, verify received amounts, and follow up on offers of help.</p>
      <DonationManagement offers={offers} />
    </>
  );
}

async function SponsorsPanel() {
  const rows = (await allChildren()).filter((c) => c.sponsor).sort((a, b) => a.no - b.no);
  const contacts = await (await getCampaign()).store.listSponsorContacts();
  const donors = donorNames(await (await getCampaign()).store.listDonationOffers());
  const dl = daysUntil(DRIVE.returnBy);

  return (
    <>
      <div className="page-h">
        <p className="muted">Contact details are visible to organizers only. {dl >= 0 ? `${dl} days to the ${DRIVE.returnByLabel} return deadline.` : `The ${DRIVE.returnByLabel} deadline has passed.`}</p>
      </div>
      <SponsorContacts contacts={contacts} />
      <h3 style={{ marginBottom: 10 }}>Angel sponsorships</h3>
      {rows.length === 0 ? (
        <div className="empty"><h3>No sponsors yet</h3><p>Sponsors appear here as soon as they adopt an angel.</p></div>
      ) : (
        <div className="tw">
          <table>
            <thead><tr><th>Sponsor</th><th>Contact</th><th>Angel</th><th>Status</th><th>Reminder text</th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const open = c.status === "claimed" || c.status === "purchased";
                const shown = displaySponsorName(c.sponsor!, donors);
                const first = shown.name.split(" ")[0];
                return (
                  <tr key={c.id}>
                    <SponsorCells id={c.sponsor!.id} name={c.sponsor!.name} email={c.sponsor!.email} phone={c.sponsor!.phone} shownName={shown.name} fromDonation={shown.fromDonation} />
                    <td><Link href={`/admin/children/${c.id}`}>{c.angel_code} {c.first_name}</Link></td>
                    <td><span className="pill claimed">{STATUS_LABEL[c.status]}</span></td>
                    <td style={{ maxWidth: 360, fontSize: ".82rem" }}>
                      {open ? <span className="muted">{`Hi ${first}, thank you for sponsoring Angel ${c.angel_code}. Gifts are due back unwrapped by ${DRIVE.returnByLabel}. Reply here if you need anything.`}</span> : <span className="muted">Done</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
