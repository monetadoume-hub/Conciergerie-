import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function OwnerCalendarPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: properties } = await supabase.from("properties").select("id, name").eq("owner_id", user.owner_id!);
  const propertyIds = (properties ?? []).map((p) => p.id);
  const propertyNames = new Map((properties ?? []).map((p) => [p.id, p.name]));

  const { data: bookings } = propertyIds.length
    ? await supabase
        .from("bookings")
        .select("id, property_id, checkin, checkout, status")
        .in("property_id", propertyIds)
        .gte("checkout", new Date().toISOString().slice(0, 10))
        .order("checkin", { ascending: true })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Calendrier</h1>
      <p className="text-sm text-neutral-500">Lecture seule — pour toute modification, contactez votre agence.</p>

      {!bookings?.length && <p className="text-sm text-neutral-400">Aucun séjour à venir.</p>}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {bookings?.map((b) => (
          <li key={b.id} className={`px-4 py-3 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
            <p className="text-sm font-medium">{propertyNames.get(b.property_id)}</p>
            <p className="text-sm text-neutral-500">
              {b.checkin} → {b.checkout} {b.status === "cancelled" && "(annulé)"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
