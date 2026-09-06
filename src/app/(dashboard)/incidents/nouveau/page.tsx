import { createIncident } from "../actions";

export default async function NewIncidentPage({
  searchParams,
}: {
  searchParams: Promise<{ property_id?: string; booking_id?: string; error?: string }>;
}) {
  const { property_id, booking_id, error } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Signaler un problème</h1>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form action={createIncident} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <input type="hidden" name="property_id" value={property_id ?? ""} />
        <input type="hidden" name="booking_id" value={booking_id ?? ""} />

        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="description">
            Description du problème
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            autoFocus
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="priority">
            Priorité
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="normal"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="low">Faible</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
        >
          Envoyer le signalement
        </button>
      </form>
    </div>
  );
}
