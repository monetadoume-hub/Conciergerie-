"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";

export async function sendOwnerMessage(formData: FormData) {
  const user = await requireUser();
  if (!user.owner_id) return;

  const supabase = await createClient();
  const propertyId = String(formData.get("property_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body || !propertyId) return;

  const { error } = await supabase.from("owner_messages").insert({
    agency_id: user.agency_id,
    owner_id: user.owner_id,
    property_id: propertyId,
    sender: "owner",
    body,
  });

  if (!error) {
    // Surfaces in the agency's own notification bell (§16, §21.3) so a
    // propriétaire message never sits unnoticed in a screen nobody opens.
    // notifications is agency-staff-only by RLS, so this one insert goes
    // through the admin client — everything else in this action still runs
    // under the owner's own session and its narrow RLS policies.
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      agency_id: user.agency_id,
      type: "owner_message",
      severity: "normal",
      title: "Nouveau message propriétaire",
      body,
    });
  }

  revalidatePath("/proprietaire/messages");
}
