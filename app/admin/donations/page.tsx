import {requireAdmin} from "@/lib/auth";
import {getCampaign} from "@/lib/campaign";
import {SiteShell} from "@/components/Festive";
import DonationManagement from "@/components/admin/DonationManagement";
export const dynamic="force-dynamic";
export default async function AdminDonations(){await requireAdmin();const offers=await (await getCampaign()).store.listDonationOffers();return <SiteShell admin><div className="page-h"><div><h2>Donations &amp; Volunteers</h2><p className="muted">Review contribution preferences, verify received amounts, and follow up on offers of help.</p></div></div><DonationManagement offers={offers}/></SiteShell>}
