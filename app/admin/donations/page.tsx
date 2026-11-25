import { redirect } from "next/navigation";

export default function AdminDonations() {
  redirect("/admin/sponsors?tab=donations");
}
