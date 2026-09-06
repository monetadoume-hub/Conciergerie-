import { createProperty } from "../actions";

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Nouveau bien</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form action={createProperty} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="name">
            Nom du bien
          </label>
          <input
            id="name"
            name="name"
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
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <fieldset className="space-y-3 border-t border-neutral-200 pt-4">
          <legend className="text-sm font-medium text-neutral-700">Liens iCal (synchronisation automatique)</legend>
          <input
            name="ical_url_airbnb"
            placeholder="URL iCal Airbnb"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <input
            name="ical_url_abritel"
            placeholder="URL iCal Abritel/Vrbo"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <input
            name="ical_url_booking"
            placeholder="URL iCal Booking"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Créer le bien
        </button>
      </form>
    </div>
  );
}
