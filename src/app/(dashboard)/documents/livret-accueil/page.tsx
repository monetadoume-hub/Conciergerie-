import { createClient } from "@/lib/supabase/server";

export default async function WelcomeBookletsPage() {
  const supabase = await createClient();
  const { data: properties } = await supabase.from("properties").select("id, name, address").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Livret d&apos;accueil</h1>
        <p className="text-sm text-neutral-500">
          Un PDF par bien, prêt à imprimer et à laisser dans le logement : wifi, accès, équipements, règles de la
          maison, consignes de départ, parking, pharmacie et numéros d&apos;urgence.
        </p>
      </div>

      {!properties?.length && <p className="text-sm text-neutral-500">Ajoutez un bien pour générer son livret.</p>}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {properties?.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              {p.address && <p className="text-xs text-neutral-500">{p.address}</p>}
            </div>
            <a
              href={`/api/documents/welcome-booklet?propertyId=${p.id}`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
            >
              Télécharger le PDF
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
