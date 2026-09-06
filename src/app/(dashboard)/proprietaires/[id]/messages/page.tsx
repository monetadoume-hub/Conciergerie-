import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendAgencyMessageToOwner } from "./actions";
import type { OwnerMessage } from "@/types/database";

export default async function OwnerMessagesAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: owner }, { data: properties }, { data: messages }] = await Promise.all([
    supabase.from("owners").select("id, name").eq("id", id).single(),
    supabase.from("properties").select("id, name").eq("owner_id", id),
    supabase
      .from("owner_messages")
      .select("*, properties(name)")
      .eq("owner_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!owner) notFound();

  const sendWithId = sendAgencyMessageToOwner.bind(null, id);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Messages — {owner.name}</h1>

      <div className="space-y-3">
        {!messages?.length && <p className="text-sm text-neutral-400">Aucun message pour l&apos;instant.</p>}
        {messages?.map((m) => {
          const msg = m as OwnerMessage & { properties: { name: string } | null };
          const isAgency = msg.sender === "agency";
          return (
            <div key={msg.id} className={isAgency ? "ml-auto max-w-[85%]" : "max-w-[85%]"}>
              <p className="mb-1 text-xs text-neutral-400">{msg.properties?.name}</p>
              <div
                className={`rounded-2xl px-3 py-2 text-sm ${
                  isAgency ? "rounded-br-sm bg-neutral-900 text-white" : "rounded-bl-sm bg-neutral-100 text-neutral-800"
                }`}
              >
                {msg.body}
              </div>
            </div>
          );
        })}
      </div>

      {!!properties?.length && (
        <form action={sendWithId} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
          {properties.length > 1 ? (
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
          ) : (
            <input type="hidden" name="property_id" value={properties[0].id} />
          )}
          <div className="flex gap-2">
            <input
              name="body"
              required
              placeholder="Répondre au propriétaire…"
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
