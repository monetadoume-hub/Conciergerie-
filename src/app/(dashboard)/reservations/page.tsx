import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const SOURCE_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  abritel: "Abritel/Vrbo",
  booking: "Booking",
  direct: "Direct",
};

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, guest_name, checkin, checkout, source, status, properties(name)")
    .order("checkin", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Réservations</h1>

      {!bookings?.length && (
        <p className="text-sm text-neutral-500">
          Aucune réservation pour l&apos;instant. Ajoutez les liens iCal de vos biens pour démarrer la synchronisation
          automatique.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Bien</th>
              <th className="px-4 py-2">Locataire</th>
              <th className="px-4 py-2">Arrivée</th>
              <th className="px-4 py-2">Départ</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {bookings?.map((booking) => (
              <tr key={booking.id} className={booking.status === "cancelled" ? "opacity-50" : ""}>
                <td className="px-4 py-2 font-medium">
                  <Link href={`/reservations/${booking.id}`} className="hover:underline">
                    {(booking.properties as unknown as { name: string } | null)?.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{booking.guest_name ?? "—"}</td>
                <td className="px-4 py-2">{booking.checkin}</td>
                <td className="px-4 py-2">{booking.checkout}</td>
                <td className="px-4 py-2">{SOURCE_LABELS[booking.source] ?? booking.source}</td>
                <td className="px-4 py-2 capitalize">
                  {booking.status === "confirmed" ? "confirmée" : "annulée"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
