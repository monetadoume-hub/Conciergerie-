import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendOwnerMessage } from "./actions";
import type { OwnerMessage } from "@/types/database";

const RECOVERY_LABEL: Record<string, string> = {
  en_attente: "en attente",
  reclame: "réclamé",
  recupere: "récupéré",
  perdu: "non recouvrable",
};

export default async function OwnerMessagesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: properties }, { data: messages }] = await Promise.all([
    supabase.from("properties").select("id, name").eq("owner_id", user.owner_id!),
    supabase
      .from("owner_messages")
      .select("*, incidents(description, repair_cost, recovery_source, recovery_status), properties(name)")
      .eq("owner_id", user.owner_id!)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Messages</h1>

      <div className="space-y-3">
        {!messages?.length && <p className="text-sm text-neutral-400">Aucun message pour l&apos;instant.</p>}
        {messages?.map((m) => {
          const msg = m as OwnerMessage & {
            incidents: { description: string; repair_cost: number | null; recovery_source: string | null; recovery_status: string | null } | null;
            properties: { name: string } | null;
          };
          const isOwner = msg.sender === "owner";
          return (
            <div key={msg.id} className={isOwner ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
              <p className="mb-1 text-xs text-neutral-400">{msg.properties?.name}</p>
              <div
                className={`rounded-2xl px-3 py-2 text-sm ${
                  isOwner ? "rounded-br-sm bg-neutral-900 text-white" : "rounded-bl-sm bg-neutral-100 text-neutral-800"
                }`}
              >
                {msg.body}
              </div>
              {msg.incidents && (
                <div className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-medium">{msg.incidents.description}</p>
                  {msg.incidents.repair_cost != null && <p>Coût de réparation : {msg.incidents.repair_cost.toFixed(2)} €</p>}
                  {msg.incidents.recovery_status && (
                    <p>Recouvrement : {RECOVERY_LABEL[msg.incidents.recovery_status]}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!!properties?.length && (
        <form action={sendOwnerMessage} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          {properties.length > 1 && (
            <select
              name="property_id"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {properties.length === 1 && <input type="hidden" name="property_id" value={properties[0].id} />}
          <div className="flex gap-2">
            <input
              name="body"
              required
              placeholder="Écrire à votre agence…"
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
            <button type="submit" className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              Envoyer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
