import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PropertiesPage() {
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Biens</h1>
        <Link
          href="/biens/nouveau"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Ajouter un bien
        </Link>
      </div>

      {!properties?.length && (
        <p className="text-sm text-neutral-500">
          Aucun bien pour l&apos;instant. Ajoutez votre premier logement pour démarrer la synchronisation des calendriers.
        </p>
      )}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {properties?.map((property) => (
          <li key={property.id}>
            <Link href={`/biens/${property.id}`} className="block px-4 py-3 hover:bg-neutral-50">
              <p className="text-sm font-medium">{property.name}</p>
              {property.address && <p className="text-sm text-neutral-500">{property.address}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
