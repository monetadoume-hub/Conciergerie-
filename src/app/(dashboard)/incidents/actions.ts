"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function createIncident(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const propertyId = String(formData.get("property_id") ?? "");
  const bookingIdRaw = String(formData.get("booking_id") ?? "");

  const { error } = await supabase.from("incidents").insert({
    agency_id: user.agency_id,
    property_id: propertyId,
    booking_id: bookingIdRaw || null,
    reported_by: user.full_name ?? user.email,
    description: String(formData.get("description") ?? ""),
    priority: String(formData.get("priority") ?? "normal"),
    status: "open",
  });

  if (error) {
    redirect(
      `/incidents/nouveau?property_id=${propertyId}&booking_id=${bookingIdRaw}&error=${encodeURIComponent(
        "Erreur lors de la création de l'incident"
      )}`
    );
  }

  redirect("/menages");
}
