import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markMessageResolved, sendManualResponse } from "../actions";
import type { GuestMessage } from "@/types/database";

const STATUS_LABEL: Record<string, string> = {
  auto_repondu: "Répondu automatiquement par l'assistant",
  en_attente_validation: "En cours de traitement",
  escalade: "À traiter",
  escalade_urgente: "Urgent — nécessite votre intervention",
  resolu: "Résolu",
};

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: message } = await supabase
    .from("guest_messages")
    .select("*, properties(name), bookings(guest_name)")
    .eq("id", id)
    .single();

  if (!message) notFound();

  const m = message as GuestMessage & {
    properties: { name: string } | null;
    bookings: { guest_name: string | null } | null;
  };

  const needsResponse = m.status === "escalade" || m.status === "escalade_urgente";
  const respondWithId = sendManualResponse.bind(null, m.id);
  const resolveWithId = markMessageResolved.bind(null, m.id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{m.properties?.name}</h1>
        <p className="text-sm text-neutral-500">
          {m.bookings?.guest_name ?? "Locataire"} — {STATUS_LABEL[m.status]}
        </p>
      </div>

      <div className="space-y-3">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-neutral-900 px-3 py-2 text-sm text-white">
          {m.guest_question}
        </p>
        {m.final_response && (
          <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-800">
            {m.final_response}
          </p>
        )}
      </div>

      {m.escalation_reason && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Motif d&apos;escalade : {m.escalation_reason}
        </p>
      )}

      {needsResponse && (
        <form action={respondWithId} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <label className="block text-sm font-medium text-neutral-700" htmlFor="response">
            Votre réponse au locataire
          </label>
          <textarea
            id="response"
            name="response"
            required
            rows={4}
            defaultValue={m.ai_draft_response ?? ""}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Envoyer et marquer résolu
          </button>
        </form>
      )}

      {!needsResponse && m.status !== "resolu" && (
        <form action={resolveWithId}>
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Marquer comme résolu
          </button>
        </form>
      )}
    </div>
  );
}
