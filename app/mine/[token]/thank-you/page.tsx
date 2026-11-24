import Link from "next/link";
import {notFound} from "next/navigation";
import {SiteShell} from "@/components/Festive";
import Celebration from "@/components/Celebration";
import SponsorChecklist from "@/components/SponsorChecklist";
import ShareCampaign from "@/components/ShareCampaign";
import {getCampaign} from "@/lib/campaign";
import {sponsorByToken} from "@/lib/data";
import {toPublic} from "@/lib/child";
import {sponsorInstructions,organizerEmail} from "@/lib/sponsorMail";
import {DRIVE,giftDropOff} from "@/lib/drive";
import {demoMode} from "@/lib/demo";

export const dynamic="force-dynamic";
export const metadata={title:"Thank You | Gift & Glam",referrer:"no-referrer" as const,robots:{index:false,follow:false}};

export default async function ThankYou({params,searchParams}:{params:{token:string};searchParams:{angel?:string;mail?:string}}){
  // A public angel code alone never grants sponsor access. Verify the private token and ownership.
  const sponsor=await sponsorByToken(params.token);if(!sponsor)notFound();
  const store=(await getCampaign()).store,all=await store.list();
  const row=all.find(c=>c.sponsor_id===sponsor.id&&c.angel_code===searchParams.angel);if(!row)notFound();
  const c=toPublic(row,all),items=await store.listGiftItems([row.id]);const siblings=c.siblings.filter(s=>s.available);
  const accepted=searchParams.mail==="sent",preview=demoMode();
  return <SiteShell><Celebration mode="holiday"/>
    <section className="panel thank-you-hero"><div className="thank-you-star" aria-hidden="true">★</div><h2>Thank you for making Christmas magical!</h2><p>You are sponsoring <b>Angel {c.code}</b>. Your kindness is helping make a child’s Christmas brighter.</p>
      <p className="ok" role="status">{preview?"This review build does not send real email.":accepted?"Your personalized confirmation was accepted for email sending. Please check your inbox.":"Save your private My Angels link. If the confirmation email doesn't arrive, use My Angels to request a new private link."}</p>
      <div className="acts"><Link href={`/mine/${params.token}`} className="btn green">Go to My Angels</Link><form action={`/mine/${params.token}/resume`} method="post"><button className="btn gold">Adopt Another Angel</button></form><Link href="/donate" className="btn ghost">Ways to Donate</Link></div>
    </section>
    <div className="cols thank-you-columns"><section className="panel"><h2>Angel {c.code} · Your shopping list</h2><p className="muted">{[c.age!=null?`${c.age} years old`:"Age not stated",c.gender].filter(Boolean).join(" · ")}</p><div className="facts">{[["Shirt",c.tops],["Pants",c.bottoms],["Shoes",c.shoes],["Favorite color",c.favColor]].filter(([,value])=>!!value).map(([label,value])=><div key={label} className="fact"><small>{label}</small>{value}</div>)}</div>{c.faves.length>0&&<p className="muted">Interests: {c.faves.join(", ")}</p>}
      <SponsorChecklist token={params.token} items={items} code={c.code} instructions={sponsorInstructions(c)} editable={row.status==="claimed"||row.status==="purchased"}/>
    </section><section className="panel"><h2>Everything you need to do</h2><ol className="thank-you-list"><li>{DRIVE.giftSuggestion}</li><li>Mark purchased gifts in My Angels, then select Done shopping.</li><li>Return gifts <b>unwrapped by {DRIVE.returnByLabel}</b>. Label every bag with {c.code}.</li><li><b>Gift drop-off</b><p style={{whiteSpace:"pre-line"}}>{giftDropOff()}</p></li><li>Gift drive giveaway: <b>{DRIVE.giveawayLabel}</b>.</li><li>If your plans change, <a href={`mailto:${organizerEmail}`}>contact the organizer</a>.</li></ol><p className="muted">Save your private My Angels link. Lost it later? <Link href="/mine">Recover it with your email.</Link></p></section></div>
    {siblings.length>0&&<section className="panel campaign-siblings"><h2>Help a sibling celebrate Christmas, too</h2><p className="muted">These angels are still available. Adopting another angel is entirely optional.</p><div className="sib-grid">{siblings.map(s=><form key={s.id} action={`/mine/${params.token}/resume`} method="post" className="fact"><input type="hidden" name="angel" value={s.firstName}/><h3>{s.firstName}</h3><p>{s.age!=null?`${s.age} years old`:"Age not stated"} · Available</p><button className="btn ghost sm">View wish list</button></form>)}</div></section>}
    <ShareCampaign/>
  </SiteShell>;
}
