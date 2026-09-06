import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  auto_repondu: "Répondu automatiquement",
  en_attente_validation: "En attente",
  escalade: "À traiter",
  escalade_urgente: "Urgent",
  resolu: "Résolu",
};

const STATUS_STYLE: Record<string, string> = {
  auto_repondu: "bg-green-50 text-green-700",
  en_attente_validation: "bg-neutral-100 text-neutral-600",
  escalade: "bg-amber-50 text-amber-700",
  escalade_urgente: "bg-red-50 text-red-700",
  resolu: "bg-neutral-100 text-neutral-400",
};

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("guest_messages")
    .select("id, guest_question, final_response, status, created_at, properties(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-neutral-500">
          Questions des locataires traitées par l&apos;assistant IA — celles qui ont besoin de vous sont marquées
          « à traiter » ou « urgent ».
        </p>
      </div>

      {!messages?.length && <p className="text-sm text-neutral-500">Aucun message pour l&apos;instant.</p>}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {messages?.map((m) => (
          <li key={m.id}>
            <Link href={`/messages/${m.id}`} className="block px-4 py-3 hover:bg-neutral-50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.guest_question}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {(m.properties as unknown as { name: string } | null)?.name}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[m.status]}`}>
                  {STATUS_LABEL[m.status]}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
