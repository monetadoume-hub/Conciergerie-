"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function createProperty(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("properties")
    .insert({
      agency_id: user.agency_id,
      name: String(formData.get("name") ?? ""),
      address: optionalText(formData, "address"),
      ical_url_airbnb: optionalText(formData, "ical_url_airbnb"),
      ical_url_abritel: optionalText(formData, "ical_url_abritel"),
      ical_url_booking: optionalText(formData, "ical_url_booking"),
      access_code: optionalText(formData, "access_code"),
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/biens/nouveau?error=${encodeURIComponent("Erreur lors de la création du bien")}`);
  }

  revalidatePath("/biens");
  redirect(`/biens/${data!.id}`);
}

export async function updateProperty(propertyId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("properties")
    .update({
      name: String(formData.get("name") ?? ""),
      address: optionalText(formData, "address"),
      ical_url_airbnb: optionalText(formData, "ical_url_airbnb"),
      ical_url_abritel: optionalText(formData, "ical_url_abritel"),
      ical_url_booking: optionalText(formData, "ical_url_booking"),
      access_code: optionalText(formData, "access_code"),
      guidebook_content: {
        access: optionalText(formData, "guide_access") ?? "",
        wifi_network: optionalText(formData, "guide_wifi_network") ?? "",
        wifi_password: optionalText(formData, "guide_wifi_password") ?? "",
        equipment: optionalText(formData, "guide_equipment") ?? "",
        around: optionalText(formData, "guide_around") ?? "",
      },
    })
    .eq("id", propertyId);

  if (error) {
    redirect(`/biens/${propertyId}?error=${encodeURIComponent("Erreur lors de la mise à jour")}`);
  }

  revalidatePath(`/biens/${propertyId}`);
  redirect(`/biens/${propertyId}?saved=1`);
}
