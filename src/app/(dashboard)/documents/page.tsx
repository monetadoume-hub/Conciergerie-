import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OwnerReportRow } from "./OwnerReportRow";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: owners } = await supabase.from("owners").select("id, name, email").order("name");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
        <Link
          href="/documents/courrier"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Rédiger un courrier
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Rapports mensuels propriétaires</h2>
        {!owners?.length && <p className="text-sm text-neutral-500">Ajoutez un propriétaire pour générer des rapports.</p>}
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {owners?.map((owner) => (
            <OwnerReportRow key={owner.id} ownerId={owner.id} ownerName={owner.name} hasEmail={!!owner.email} />
          ))}
        </ul>
      </section>
    </div>
  );
}
