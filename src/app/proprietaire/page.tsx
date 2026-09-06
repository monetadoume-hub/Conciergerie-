import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { computeOwnerMonthlyReport } from "@/lib/pdf/generate";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function OwnerHomePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address")
    .eq("owner_id", user.owner_id!);

  const propertyIds = (properties ?? []).map((p) => p.id);

  const { data: nextBooking } = propertyIds.length
    ? await supabase
        .from("bookings")
        .select("checkin, property_id")
        .in("property_id", propertyIds)
        .eq("status", "confirmed")
        .gte("checkin", new Date().toISOString().slice(0, 10))
        .order("checkin", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const report = user.owner_id ? await computeOwnerMonthlyReport(user.owner_id, currentMonth()).catch(() => null) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Bonjour</h1>

      {report && (
        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-medium text-neutral-500">Ce mois-ci (en cours)</h2>
          <div className="mt-2 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold">{report.netAmount.toFixed(0)} €</p>
              <p className="text-xs text-neutral-500">net estimé</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{report.totalRevenue.toFixed(0)} €</p>
              <p className="text-xs text-neutral-500">revenu brut</p>
            </div>
          </div>
          {nextBooking && (
            <p className="mt-3 text-sm text-neutral-600">Prochaine arrivée : {nextBooking.checkin}</p>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">
          {properties && properties.length > 1 ? "Vos biens" : "Votre bien"}
        </h2>
        {!properties?.length && <p className="text-sm text-neutral-400">Aucun bien associé à votre compte.</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {properties?.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-sm font-medium">{p.name}</p>
              {p.address && <p className="text-sm text-neutral-500">{p.address}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Link href="/proprietaire/calendrier" className="rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm font-medium hover:bg-neutral-50">
          Calendrier
        </Link>
        <Link href="/proprietaire/rapports" className="rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm font-medium hover:bg-neutral-50">
          Rapports
        </Link>
        <Link href="/proprietaire/messages" className="rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm font-medium hover:bg-neutral-50">
          Messages
        </Link>
      </section>
    </div>
  );
}
