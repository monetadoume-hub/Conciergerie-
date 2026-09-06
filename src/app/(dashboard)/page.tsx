import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function TodayPage() {
  const user = await requireUser();
  if (user.role === "cleaner") redirect("/menages");

  const supabase = await createClient();
  const date = today();

  const [{ data: arrivals }, { data: departures }, { data: cleanings }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, guest_name, checkin, properties(name)")
      .eq("checkin", date)
      .eq("status", "confirmed"),
    supabase
      .from("bookings")
      .select("id, guest_name, checkout, properties(name)")
      .eq("checkout", date)
      .eq("status", "confirmed"),
    supabase
      .from("cleaning_tasks")
      .select("id, status, properties(name), users(full_name)")
      .eq("scheduled_date", date),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aujourd&apos;hui</h1>
        <p className="text-sm text-neutral-500">
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">Arrivées</h2>
          {!arrivals?.length && <p className="mt-2 text-sm text-neutral-400">Aucune arrivée aujourd&apos;hui</p>}
          <ul className="mt-2 space-y-2">
            {arrivals?.map((b) => (
              <li key={b.id} className="text-sm">
                <span className="font-medium">{(b.properties as unknown as { name: string } | null)?.name}</span>
                {" — "}
                {b.guest_name ?? "Locataire à confirmer"}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">Départs</h2>
          {!departures?.length && <p className="mt-2 text-sm text-neutral-400">Aucun départ aujourd&apos;hui</p>}
          <ul className="mt-2 space-y-2">
            {departures?.map((b) => (
              <li key={b.id} className="text-sm">
                <span className="font-medium">{(b.properties as unknown as { name: string } | null)?.name}</span>
                {" — "}
                {b.guest_name ?? "Locataire à confirmer"}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-500">Ménages du jour</h2>
          <Link href="/menages" className="text-sm font-medium text-neutral-900 underline">
            Voir le planning
          </Link>
        </div>
        {!cleanings?.length && <p className="mt-2 text-sm text-neutral-400">Aucun ménage prévu aujourd&apos;hui</p>}
        <ul className="mt-2 space-y-2">
          {cleanings?.map((task) => (
            <li key={task.id} className="flex items-center justify-between text-sm">
              <span>
                <span className="font-medium">{(task.properties as unknown as { name: string } | null)?.name}</span>
                {" — "}
                {(task.users as unknown as { full_name: string } | null)?.full_name ?? "Non assigné"}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs capitalize text-neutral-600">
                {task.status === "todo" ? "à faire" : task.status === "in_progress" ? "en cours" : "terminé"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
