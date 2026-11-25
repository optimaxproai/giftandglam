import { getSponsorStore } from "@/lib/review-sponsorship";
import { SiteShell } from "@/components/Festive";
import InteractiveTree from "@/components/InteractiveTree";
import { publicTree } from "@/lib/child";
import { campaignImpact, type CampaignImpact as Totals } from "@/lib/campaignImpact";
import { sponsorSession } from "@/lib/sponsor-session";
import CampaignImpact from "@/components/CampaignImpact";
import ShareCampaign from "@/components/ShareCampaign";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const metadata = { title: "Paradigm & Oh MyMy’s Gift & Glam — 10th Annual Holiday Giving Celebration" };

export default async function Home({searchParams}: {searchParams?: {angel?: string}}) {
  let kids: ReturnType<typeof publicTree> = [];
  let totals: Totals | null = null;
  let failed = false;
  let hasSponsorSession = false;
  try {
    const store = await getSponsorStore();
    const rows = await store.list();
    kids = publicTree(rows);
    const token = sponsorSession();
    const [stats, session] = await Promise.allSettled([
      Promise.all([store.listGiftItems(),store.listDonationOffers()]).then(([items,offers])=>campaignImpact(rows,items,offers)),
      token ? store.sponsorByToken(token) : Promise.resolve(null),
    ]);
    if (stats.status === "fulfilled") totals = stats.value;
    hasSponsorSession = session.status === "fulfilled" && !!session.value;
  } catch { failed = true; }
  return <SiteShell hero={<InteractiveTree key={searchParams?.angel || "tree"} kids={kids} failed={failed} totals={totals} initialCode={searchParams?.angel} hasSponsorSession={hasSponsorSession}/> }>
    <p className="campaign-thanks">Thank you for helping make Christmas brighter for a child!</p>
    {totals && <CampaignImpact totals={totals}/>}
    <ShareCampaign/>
  </SiteShell>;
}
