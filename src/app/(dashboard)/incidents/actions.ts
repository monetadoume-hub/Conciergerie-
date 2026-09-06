"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/messaging/resend";
import { computeDamageClaimDossier, renderDamageClaimDossierPdf } from "@/lib/pdf/generate";

export async function createIncident(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const propertyId = String(formData.get("property_id") ?? "");
  const bookingIdRaw = String(formData.get("booking_id") ?? "");

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      agency_id: user.agency_id,
      property_id: propertyId,
      booking_id: bookingIdRaw || null,
      reported_by: user.full_name ?? user.email,
      description: String(formData.get("description") ?? ""),
      priority: String(formData.get("priority") ?? "normal"),
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/incidents/nouveau?property_id=${propertyId}&booking_id=${bookingIdRaw}&error=${encodeURIComponent(
        "Erreur lors de la création de l'incident"
      )}`
    );
  }

  redirect(user.role === "cleaner" ? "/menages" : `/incidents/${data!.id}`);
}

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function updateIncident(incidentId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  await supabase
    .from("incidents")
    .update({
      description: String(formData.get("description") ?? ""),
      damage_type: optionalText(formData, "damage_type"),
      damage_date: optionalText(formData, "damage_date"),
      priority: String(formData.get("priority") ?? "normal"),
      status: String(formData.get("status") ?? "open"),
      repair_needed: formData.get("repair_needed") === "on",
      repair_company: optionalText(formData, "repair_company"),
      repair_cost: formData.get("repair_cost") ? Number(formData.get("repair_cost")) : null,
      recovery_source: optionalText(formData, "recovery_source"),
      recovery_status: optionalText(formData, "recovery_status"),
    })
    .eq("id", incidentId);

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath("/incidents");
}

export async function addIncidentPhoto(incidentId: string, photoUrl: string) {
  const supabase = await createClient();
  const { data: incident } = await supabase.from("incidents").select("photos").eq("id", incidentId).single();
  if (!incident) return;

  await supabase
    .from("incidents")
    .update({ photos: [...(incident.photos ?? []), photoUrl] })
    .eq("id", incidentId);

  revalidatePath(`/incidents/${incidentId}`);
}

export async function addIncidentDocument(incidentId: string, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const fileUrl = String(formData.get("file_url") ?? "");
  if (!fileUrl) return;

  await supabase.from("incident_documents").insert({
    agency_id: user.agency_id,
    incident_id: incidentId,
    type: String(formData.get("type") ?? "autre"),
    label: String(formData.get("label") ?? "Document"),
    file_url: fileUrl,
    amount: formData.get("amount") ? Number(formData.get("amount")) : null,
    artisan_name: optionalText(formData, "artisan_name"),
  });

  revalidatePath(`/incidents/${incidentId}`);
}

export async function shareIncidentWithOwner(incidentId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("property_id, description, agency_id, properties(owner_id)")
    .eq("id", incidentId)
    .single();

  const ownerId = (incident?.properties as unknown as { owner_id: string | null } | null)?.owner_id;
  if (!incident || !ownerId) return;

  await supabase.from("owner_messages").insert({
    agency_id: user.agency_id,
    owner_id: ownerId,
    property_id: incident.property_id,
    sender: "agency",
    body: `Un incident a été signalé : ${incident.description}`,
    incident_id: incidentId,
  });

  revalidatePath(`/incidents/${incidentId}`);
}

export async function sendDamageClaimDossierEmail(incidentId: string, recipientEmail: string) {
  await requireUser();

  const dossier = await computeDamageClaimDossier(incidentId);
  const pdf = await renderDamageClaimDossierPdf(dossier);

  await sendEmail({
    to: recipientEmail,
    subject: `Dossier de réclamation — ${dossier.propertyName}`,
    text: `Bonjour,\n\nVeuillez trouver ci-joint le dossier de réclamation concernant un dommage constaté à ${dossier.propertyName}.\n\nCordialement,\n${dossier.agencyName}`,
    attachments: [{ filename: "dossier-reclamation.pdf", content: pdf }],
  });
}
