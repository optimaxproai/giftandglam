import Link from "next/link";
import { SiteShell } from "@/components/Festive";
import DonationOptions from "@/components/DonationOptions";
import { demoMode } from "@/lib/demo";

export const metadata = { title: "Donate | Gift & Glam" };
export const dynamic="force-dynamic";

export default function DonatePage() {
  return <SiteShell><div className="page-h"><Link href="/" className="btn ghost sm">Back to the tree</Link></div><DonationOptions demo={demoMode()}/></SiteShell>;
}
