import { SiteShell } from "@/components/Festive";
import ImportClient from "@/components/admin/ImportClient";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();
  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <h2>Import family emails</h2>
          <p className="muted" style={{ maxWidth: "60ch" }}>
            Upload the printed email. Claude reads it, finds every child (siblings stay together under one parent), and crops each child&apos;s photo from the page. You review everything before it goes on the tree.
          </p>
        </div>
      </div>
      <ImportClient />
    </SiteShell>
  );
}
