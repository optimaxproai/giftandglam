import type { CampaignImpact as Totals } from "@/lib/campaignImpact";

export default function CampaignImpact({ totals }: { totals: Totals }) {
  const metrics = [["Angels sponsored",totals.sponsored],["Children given gifts",totals.childrenGiven],["Families supported",totals.familiesSupported],["Gifts received",totals.received],["Volunteer offers",totals.volunteerOffers]] as const;
  return <section className="campaign-impact panel" aria-labelledby="impact-heading">
    <h2 id="impact-heading">Our 2026 Impact</h2>
    <p className="muted">Together, we are making Christmas brighter. Updated as organizers record progress.</p>
    <div className="impact-metrics">{metrics.map(([label,count])=><div key={label} className="kpi"><small>{label}</small><b>{count}</b></div>)}</div>
    <p className="muted" style={{fontSize:".8rem",marginTop:12}}>Families supported counts families with a recorded gift handoff. Volunteer offers are expressions of interest, not confirmed event attendance.</p>
  </section>;
}
