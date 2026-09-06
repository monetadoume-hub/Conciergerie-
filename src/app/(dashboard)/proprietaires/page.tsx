import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function OwnersPage() {
  const supabase = await createClient();
  const { data: owners } = await supabase.from("owners").select("id, name, email, phone").order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Propriétaires</h1>
        <Link
          href="/proprietaires/nouveau"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Ajouter un propriétaire
        </Link>
      </div>

      {!owners?.length && <p className="text-sm text-neutral-500">Aucun propriétaire pour l&apos;instant.</p>}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {owners?.map((owner) => (
          <li key={owner.id} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
            <Link href={`/proprietaires/${owner.id}`} className="flex-1">
              <p className="text-sm font-medium">{owner.name}</p>
              <p className="text-sm text-neutral-500">{owner.email ?? owner.phone ?? "—"}</p>
            </Link>
            <Link href={`/proprietaires/${owner.id}/messages`} className="text-xs font-medium text-neutral-500 underline">
              Messages
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
