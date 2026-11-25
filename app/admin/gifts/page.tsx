import { redirect } from "next/navigation";

export default function GiftsPage({ searchParams }: { searchParams: { filter?: string } }) {
  const params = new URLSearchParams({ view: "gift" });
  if (searchParams.filter) params.set("filter", searchParams.filter);
  redirect(`/admin/children?${params}`);
}
