"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/messaging/resend";

export async function sendAgencyMessageToOwner(ownerId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const propertyId = String(formData.get("property_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body || !propertyId) return;

  const { error } = await supabase.from("owner_messages").insert({
    agency_id: user.agency_id,
    owner_id: ownerId,
    property_id: propertyId,
    sender: "agency",
    body,
  });

  if (!error) {
    const [{ data: owner }, { data: agency }] = await Promise.all([
      supabase.from("owners").select("email, name").eq("id", ownerId).single(),
      supabase.from("agencies").select("name").eq("id", user.agency_id).single(),
    ]);

    // The message is already in the owner's reserved space by the insert
    // above — this email is the second, independent notification channel
    // the request asked for, in case the owner doesn't check the portal.
    if (owner?.email) {
      await sendEmail({
        to: owner.email,
        subject: `Nouveau message de ${agency?.name ?? "votre agence"}`,
        text: `Bonjour ${owner.name},\n\n${body}\n\nRetrouvez l'échange complet dans votre espace propriétaire.`,
      }).catch(() => null);
    }
  }

  revalidatePath(`/proprietaires/${ownerId}/messages`);
}
