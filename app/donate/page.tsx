import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import DonationCopy from "@/components/DonationCopy";
import { DONATIONS } from "@/lib/donations";

export const metadata = { title: "Donate | Gift & Glam" };

export default function DonatePage() {
  return <SiteShell>
    <div className="page-h"><Link href="/" className="btn ghost sm">← Back to the tree</Link></div>
    <div className="panel" style={{ padding: 24 }}>
      <div className="ribbon" />
      <h2 style={{ color: "var(--pine)", fontSize: "clamp(1.8rem, 5vw, 2.8rem)", marginBottom: 10 }}>Give a little holiday magic</h2>
      <p>Can’t adopt an angel this year? You can still support Paradigm &amp; Oh MyMy’s Gift &amp; Glam 10th Annual Holiday Giving Celebration. Donations help the organizers provide gifts and fill gaps for children.</p>
      <p style={{ marginBlock: 14 }}><b>Choose how to give:</b> make a donation of any amount using one of the organizer’s listed payment methods. Verify the recipient in your payment app before sending.</p>
      <div className="three" style={{ alignItems: "stretch" }}>
        <section className="panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <h3 style={{ color: "var(--pine)" }}>PayPal</h3><p className="muted">Open the organizer’s PayPal page and enter your donation amount.</p>
          <div className="fact" style={{ overflowWrap: "anywhere" }}>PayPal.me/giftandgive</div>
          <a href={DONATIONS.paypal} className="btn green" target="_blank" rel="noopener noreferrer">Donate via PayPal ↗</a>
        </section>
        <section className="panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <h3 style={{ color: "var(--pine)" }}>Zelle</h3><p className="muted">Copy this email address. Open Zelle in your bank’s app, enter the recipient and amount, then review and send.</p>
          <DonationCopy value={DONATIONS.zelle} label="Zelle email" />
        </section>
        <section className="panel" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <h3 style={{ color: "var(--pine)" }}>Cash App</h3><p className="muted">Copy the $Cashtag, find the organizer in Cash App, enter the amount, then review and send.</p>
          <DonationCopy value={DONATIONS.cashApp} label="Cashtag" />
        </section>
      </div>
      <p className="muted" style={{ marginTop: 16, fontSize: ".88rem" }}>This website does not take or store payment information, confirm transfers, or issue receipts. Complete the donation in your chosen payment service. For donation questions, <a href={`mailto:${DONATIONS.organizerEmail}`}>email the organizer</a>.</p>
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)", display: "grid", gap: 8 }}>
        <h3>Prefer to give gifts?</h3>
        <p>To offer unwrapped gifts or other in-kind support without selecting a specific angel, contact the organizer.</p>
        <div className="acts"><a href={`mailto:${DONATIONS.organizerEmail}?subject=Gift%20%26%20Glam%20gift%20donation`} className="btn ghost">Offer a gift donation</a><Link href="/" className="btn">Choose an angel instead</Link></div>
      </div>
    </div>
  </SiteShell>;
}
