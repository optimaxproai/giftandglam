import { DRIVE, giftDropOff } from "./drive";
import type { PublicChild } from "./types";
import { demoMode } from "./demo";

export const organizerEmail = "paradigmgiftdrive@gmail.com";
export function sponsorInstructions(c: PublicChild) {
  const list = (title:string, items:string[]) => `${title}\n${items.length ? items.map(s=>`• ${s}`).join("\n") : "Not listed"}`;
  return [ `Angel ${c.code}`, [c.age===null?"Age not stated":`${c.age} years old`,c.gender||""].filter(Boolean).join(" · "), list("Wants",c.wants),list("Needs",c.needs),list("Sizes",[c.tops&&`Shirt: ${c.tops}`,c.coat_size&&`Coat: ${c.coat_size}`,c.bottoms&&`Pants: ${c.bottoms}`,c.shoes&&`Shoes: ${c.shoes}`,c.favColor&&`Favorite color: ${c.favColor}`].filter((v):v is string=>!!v)),list("Optional gift cards",c.gifts.map(g=>`$${g.amount} ${g.store}`)),list("Interests",c.faves),DRIVE.giftSuggestion,`Return gifts unwrapped by ${DRIVE.returnByLabel}. Label each gift bag with ${c.code}.`,`Gift drop-off\n${giftDropOff()}`,`Giveaway: ${DRIVE.giveawayLabel}. If your plans change, contact ${organizerEmail}.` ].join("\n\n");
}

export async function sendSponsorMail(to:string, subject:string, body:string): Promise<"sent"|"unavailable"|"demo"> {
  if (demoMode()) return "demo";
  const key=process.env.RESEND_API_KEY;
  if (!key) return "unavailable";
  try {
    const result=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({from:process.env.ANGEL_FROM_EMAIL||"Angel Tree <angeltree@optimaxproai.com>",to,subject,text:body,reply_to:organizerEmail}),signal:AbortSignal.timeout(8000)});
    return result.ok?"sent":"unavailable";
  } catch { return "unavailable"; }
}
export function sponsorLink(token:string) { const site=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,""); return site?`${site}/mine/${token}`:null; }
