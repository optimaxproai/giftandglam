import { SiteShell } from "@/components/Festive";
import ImportClient from "@/components/admin/ImportClient";
import { requireAdmin } from "@/lib/auth";
import {demoMode} from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireAdmin();
  return (
    <SiteShell admin>
      <div className="page-h">
        <div>
          <h2>Import family applications</h2>
          <p className="muted" style={{ maxWidth: "60ch" }}>
            Upload a CSV for local, deterministic reading of each child and family. PDF and email reading uses an external AI service; review all results before saving. Choose CSV or manual entry for confidential intake without AI. Nothing goes on the tree until the organizer approves and publishes it.
          </p>
        </div>
      </div>
      <ImportClient demo={demoMode()}/>
    </SiteShell>
  );
}
