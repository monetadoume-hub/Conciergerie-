import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBookingDetails } from "../actions";
import type { Booking } from "@/types/database";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, properties(name)")
    .eq("id", id)
    .single();

  if (!booking) notFound();

  const b = booking as Booking & { properties: { name: string } | null };
  const updateWithId = updateBookingDetails.bind(null, b.id);
  const guideUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/guide/${b.guide_token}`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{b.properties?.name}</h1>
        <p className="text-sm text-neutral-500">
          {b.checkin} → {b.checkout}
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Modifications enregistrées</p>}

      <p className="rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
        Guide digital du locataire :{" "}
        <a href={guideUrl} target="_blank" rel="noreferrer" className="font-medium underline">
          {guideUrl}
        </a>
      </p>

      <form action={updateWithId} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-xs text-neutral-500">
          Le flux iCal ne transmet ni le prix ni les coordonnées du locataire — complétez-les ici dès leur
          connaissance.
        </p>
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="guest_name">
            Nom du locataire
          </label>
          <input
            id="guest_name"
            name="guest_name"
            defaultValue={b.guest_name ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="guest_email">
              Email
            </label>
            <input
              id="guest_email"
              name="guest_email"
              type="email"
              defaultValue={b.guest_email ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="guest_phone">
              Téléphone
            </label>
            <input
              id="guest_phone"
              name="guest_phone"
              defaultValue={b.guest_phone ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="price">
              Prix (€)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              defaultValue={b.price ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700" htmlFor="deposit_amount">
              Caution (€)
            </label>
            <input
              id="deposit_amount"
              name="deposit_amount"
              type="number"
              step="0.01"
              defaultValue={b.deposit_amount ?? ""}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
