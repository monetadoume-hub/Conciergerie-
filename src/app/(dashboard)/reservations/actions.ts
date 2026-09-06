"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const text = optionalText(formData, key);
  return text ? Number(text) : null;
}

// The iCal feeds never carry price or guest contact details (§5.2) — this is
// where the agency fills them in manually once the reservation appears.
export async function updateBookingDetails(bookingId: string, formData: FormData) {
  const supabase = await createClient();

  const guestEmail = optionalText(formData, "guest_email");

  const { error } = await supabase
    .from("bookings")
    .update({
      guest_name: optionalText(formData, "guest_name"),
      guest_email: guestEmail,
      guest_phone: optionalText(formData, "guest_phone"),
      price: optionalNumber(formData, "price"),
      deposit_amount: optionalNumber(formData, "deposit_amount"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    redirect(`/reservations/${bookingId}?error=${encodeURIComponent("Erreur lors de la mise à jour")}`);
  }

  if (guestEmail) {
    // Retry sequences that had previously failed for lack of a known email.
    await supabase
      .from("scheduled_messages")
      .update({ status: "pending", error: null })
      .eq("booking_id", bookingId)
      .eq("status", "failed");
  }

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${bookingId}`);
  redirect(`/reservations/${bookingId}?saved=1`);
}
