import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProperty } from "../actions";
import type { Property } from "@/types/database";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("*").eq("id", id).single();

  if (!property) notFound();

  const p = property as Property;
  const updateWithId = updateProperty.bind(null, p.id);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">{p.name}</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Modifications enregistrées</p>}

      <form action={updateWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="name">
            Nom du bien
          </label>
          <input
            id="name"
            name="name"
            defaultValue={p.name}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="address">
            Adresse
          </label>
          <input
            id="address"
            name="address"
            defaultValue={p.address ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="access_code">
            Code d&apos;accès
          </label>
          <input
            id="access_code"
            name="access_code"
            defaultValue={p.access_code ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <fieldset className="space-y-3 border-t border-neutral-200 pt-4">
          <legend className="text-sm font-medium text-neutral-700">Liens iCal (synchronisation automatique)</legend>
          <input
            name="ical_url_airbnb"
            placeholder="URL iCal Airbnb"
            defaultValue={p.ical_url_airbnb ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <input
            name="ical_url_abritel"
            placeholder="URL iCal Abritel/Vrbo"
            defaultValue={p.ical_url_abritel ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <input
            name="ical_url_booking"
            placeholder="URL iCal Booking"
            defaultValue={p.ical_url_booking ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </fieldset>

        <fieldset className="space-y-3 border-t border-neutral-200 pt-4">
          <legend className="text-sm font-medium text-neutral-700">Guide digital du logement</legend>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_access">
              Accès (porte, parking, digicode)
            </label>
            <textarea
              id="guide_access"
              name="guide_access"
              defaultValue={p.guidebook_content?.access ?? ""}
              rows={2}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_wifi_network">
                Réseau wifi
              </label>
              <input
                id="guide_wifi_network"
                name="guide_wifi_network"
                defaultValue={p.guidebook_content?.wifi_network ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_wifi_password">
                Mot de passe wifi
              </label>
              <input
                id="guide_wifi_password"
                name="guide_wifi_password"
                defaultValue={p.guidebook_content?.wifi_password ?? ""}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_equipment">
              Équipements (lave-linge, chauffage, TV, machine à café...)
            </label>
            <textarea
              id="guide_equipment"
              name="guide_equipment"
              defaultValue={p.guidebook_content?.equipment ?? ""}
              rows={3}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_around">
              Autour de vous (restaurants, transports, pharmacie)
            </label>
            <textarea
              id="guide_around"
              name="guide_around"
              defaultValue={p.guidebook_content?.around ?? ""}
              rows={3}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
