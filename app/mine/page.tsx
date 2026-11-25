import { browserReviewAdoptions, getSponsorStore } from "@/lib/review-sponsorship";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/Festive";
import RecoverSponsor from "@/components/RecoverSponsor";
import { sponsorSession } from "@/lib/sponsor-session";

export const dynamic="force-dynamic";
export default async function MyAngelsHome({searchParams}:{searchParams:{preview?:string}}){const token=sponsorSession();if(token&&await (await getSponsorStore()).sponsorByToken(token))redirect(`/mine/${token}`);return <SiteShell><div className="page-h"><div><h2>My Angels</h2><p className="muted">Return to your shopping checklist or request a replacement private link.</p></div></div><div className="panel" style={{maxWidth:560,margin:"0 auto"}}><h3 style={{marginBottom:12}}>Find my sponsorship</h3>{browserReviewAdoptions() ? <><p>{searchParams.preview === "expired" ? "That preview checklist came from an earlier build or another browser. Choose an angel to start a new fictional adoption." : "Preview adoptions are saved in this browser. Use the tree to start a fictional adoption."}</p><a className="btn" href="/">Back to the tree</a></> : <RecoverSponsor/>}<p className="muted" style={{marginTop:12}}>Your angel code is public. For your privacy, access is sent only to the email recorded on the sponsorship. No password required.</p><p style={{marginTop:10}}>Need help? <a href="mailto:paradigmgiftdrive@gmail.com">Contact the Gift &amp; Glam organizers.</a></p></div></SiteShell>}
