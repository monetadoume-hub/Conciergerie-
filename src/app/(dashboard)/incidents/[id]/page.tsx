import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { shareIncidentWithOwner, updateIncident } from "../actions";
import { IncidentPhotoUpload } from "./IncidentPhotoUpload";
import { IncidentDocumentForm } from "./IncidentDocumentForm";
import { DossierActions } from "./DossierActions";
import type { CleaningTask, Incident, IncidentDocument } from "@/types/database";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*, properties(name, owner_id)")
    .eq("id", id)
    .single();

  if (!incident) notFound();

  const inc = incident as Incident & { properties: { name: string; owner_id: string | null } | null };

  const [{ data: cleaningTask }, { data: documents }] = await Promise.all([
    inc.booking_id
      ? supabase.from("cleaning_tasks").select("*").eq("booking_id", inc.booking_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("incident_documents").select("*").eq("incident_id", id).order("created_at", { ascending: false }),
  ]);

  const updateWithId = updateIncident.bind(null, id);
  const shareWithId = shareIncidentWithOwner.bind(null, id);
  const task = cleaningTask as CleaningTask | null;
  const docs = (documents ?? []) as IncidentDocument[];
  const documentsTotal = docs.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{inc.properties?.name}</h1>
        <DossierActions incidentId={id} />
      </div>

      <form action={updateWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={inc.description}
            required
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="damage_type">
              Nature du dommage
            </label>
            <input
              id="damage_type"
              name="damage_type"
              defaultValue={inc.damage_type ?? ""}
              placeholder="Dégât des eaux, casse..."
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="damage_date">
              Date du dommage
            </label>
            <input
              id="damage_date"
              name="damage_date"
              type="date"
              defaultValue={inc.damage_date ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="priority">
              Priorité
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={inc.priority}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="low">Faible</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="status">
              Statut
            </label>
            <select
              id="status"
              name="status"
              defaultValue={inc.status}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="open">Ouvert</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
            </select>
          </div>
        </div>

        <fieldset className="space-y-3 border-t border-neutral-200 pt-4">
          <legend className="text-sm font-medium text-neutral-700">Réparation & recouvrement</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="repair_needed" defaultChecked={inc.repair_needed} className="h-4 w-4 rounded border-neutral-300" />
            Intervention d&apos;un artisan nécessaire
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              name="repair_company"
              defaultValue={inc.repair_company ?? ""}
              placeholder="Entreprise / artisan"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
            <input
              name="repair_cost"
              type="number"
              step="0.01"
              defaultValue={inc.repair_cost ?? (documentsTotal || "")}
              placeholder="Coût total (€)"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          {documentsTotal > 0 && (
            <p className="text-xs text-neutral-500">Somme des devis/factures ci-dessous : {documentsTotal.toFixed(2)} €</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <select
              name="recovery_source"
              defaultValue={inc.recovery_source ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Source de recouvrement</option>
              <option value="caution_locataire">Caution locataire</option>
              <option value="assurance">Assurance</option>
              <option value="agence">Agence</option>
              <option value="proprietaire">Propriétaire</option>
            </select>
            <select
              name="recovery_status"
              defaultValue={inc.recovery_status ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="">Statut de recouvrement</option>
              <option value="en_attente">En attente</option>
              <option value="reclame">Réclamé</option>
              <option value="recupere">Récupéré</option>
              <option value="perdu">Non recouvrable</option>
            </select>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Enregistrer
        </button>
      </form>

      {inc.properties?.owner_id && (
        <form action={shareWithId}>
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Partager avec le propriétaire
          </button>
        </form>
      )}

      <IncidentPhotoUpload incidentId={id} photos={inc.photos} />

      {task && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">Compte-rendu de ménage lié</h2>
          <p className="mt-1 text-xs text-neutral-500">Ménage du {task.scheduled_date}, statut : {task.status}</p>
          {task.photos_after.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.photos_after.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="Photo de fin de ménage" className="h-20 w-20 rounded-md object-cover" />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-400">Aucune photo de fin de ménage disponible.</p>
          )}
        </section>
      )}

      <IncidentDocumentForm incidentId={id} documents={docs} />
    </div>
  );
}
