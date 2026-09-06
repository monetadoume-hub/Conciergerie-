import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = { open: "ouvert", in_progress: "en cours", resolved: "résolu" };
const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600",
  normal: "bg-neutral-100 text-neutral-600",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default async function IncidentsPage() {
  const supabase = await createClient();
  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, description, status, priority, damage_type, created_at, properties(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Incidents & dommages</h1>
        <Link
          href="/incidents/nouveau"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Signaler un incident
        </Link>
      </div>

      {!incidents?.length && <p className="text-sm text-neutral-500">Aucun incident pour l&apos;instant.</p>}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {incidents?.map((i) => (
          <li key={i.id}>
            <Link href={`/incidents/${i.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{i.description}</p>
                <p className="text-xs text-neutral-500">
                  {(i.properties as unknown as { name: string } | null)?.name}
                  {i.damage_type ? ` — ${i.damage_type}` : ""} — {STATUS_LABEL[i.status]}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[i.priority]}`}>
                {i.priority}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
