import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addExpense, updateProperty } from "../actions";
import type { Expense, Property } from "@/types/database";

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
  const [{ data: property }, { data: expenses }, { data: owners }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).single(),
    supabase.from("expenses").select("*").eq("property_id", id).order("expense_date", { ascending: false }).limit(20),
    supabase.from("owners").select("id, name").order("name"),
  ]);

  if (!property) notFound();

  const p = property as Property;
  const updateWithId = updateProperty.bind(null, p.id);
  const addExpenseWithId = addExpense.bind(null, p.id);

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
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="owner_id">
            Propriétaire
          </label>
          <select
            id="owner_id"
            name="owner_id"
            defaultValue={p.owner_id ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="">Aucun</option>
            {owners?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
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

        <fieldset className="space-y-3 border-t border-neutral-200 pt-4">
          <legend className="text-sm font-medium text-neutral-700">
            Livret d&apos;accueil imprimable (à laisser dans le logement)
          </legend>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_house_rules">
              Règles de la maison
            </label>
            <textarea
              id="guide_house_rules"
              name="guide_house_rules"
              defaultValue={p.guidebook_content?.house_rules ?? ""}
              rows={3}
              placeholder="Non-fumeur, pas de fête, heures de calme..."
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_checkout_instructions">
              Consignes de départ
            </label>
            <textarea
              id="guide_checkout_instructions"
              name="guide_checkout_instructions"
              defaultValue={p.guidebook_content?.checkout_instructions ?? ""}
              rows={3}
              placeholder="Vaisselle, poubelles, clés, heure limite..."
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_parking_info">
              Parking à proximité
            </label>
            <textarea
              id="guide_parking_info"
              name="guide_parking_info"
              defaultValue={p.guidebook_content?.parking_info ?? ""}
              rows={2}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_pharmacy_info">
              Pharmacie la plus proche
            </label>
            <textarea
              id="guide_pharmacy_info"
              name="guide_pharmacy_info"
              defaultValue={p.guidebook_content?.pharmacy_info ?? ""}
              rows={2}
              placeholder="Nom, adresse, téléphone"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="guide_local_emergency_notes">
              Urgences locales (commissariat, hôpital le plus proche...)
            </label>
            <textarea
              id="guide_local_emergency_notes"
              name="guide_local_emergency_notes"
              defaultValue={p.guidebook_content?.local_emergency_notes ?? ""}
              rows={2}
              placeholder="Les numéros nationaux (17, 18, 15, 112) figurent déjà automatiquement sur le livret"
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

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-medium text-neutral-500">
          Dépenses (imputées au propriétaire dans son rapport mensuel)
        </h2>
        {(expenses as Expense[] | null)?.length ? (
          <ul className="divide-y divide-neutral-100 text-sm">
            {(expenses as Expense[]).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-1.5">
                <span>
                  {e.expense_date} — {e.category}
                </span>
                <span className="font-medium">{e.amount.toFixed(2)} €</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">Aucune dépense enregistrée.</p>
        )}

        <form action={addExpenseWithId} className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="category">
              Catégorie
            </label>
            <input
              id="category"
              name="category"
              required
              placeholder="Maintenance, ménage..."
              className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="amount">
              Montant (€)
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              required
              className="mt-1 w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500" htmlFor="expense_date">
              Date
            </label>
            <input
              id="expense_date"
              name="expense_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
          >
            Ajouter
          </button>
        </form>
      </section>
    </div>
  );
}
