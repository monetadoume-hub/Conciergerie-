"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";

function optionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function createOwner(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("owners")
    .insert({
      agency_id: user.agency_id,
      name: String(formData.get("name") ?? ""),
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      commission_rate: formData.get("commission_rate") ? Number(formData.get("commission_rate")) : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/proprietaires/nouveau?error=${encodeURIComponent("Erreur lors de la création")}`);
  }

  revalidatePath("/proprietaires");
  redirect(`/proprietaires/${data!.id}`);
}

export async function updateOwner(ownerId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("owners")
    .update({
      name: String(formData.get("name") ?? ""),
      email: optionalText(formData, "email"),
      phone: optionalText(formData, "phone"),
      commission_rate: formData.get("commission_rate") ? Number(formData.get("commission_rate")) : null,
    })
    .eq("id", ownerId);

  if (error) {
    redirect(`/proprietaires/${ownerId}?error=${encodeURIComponent("Erreur lors de la mise à jour")}`);
  }

  revalidatePath(`/proprietaires/${ownerId}`);
  redirect(`/proprietaires/${ownerId}?saved=1`);
}

/**
 * Provisions the owner's dedicated portal account (cahier des charges §16):
 * a Supabase Auth user is invited by email, then linked to this owner row
 * via a `role: 'owner'` profile — bypassing RLS with the admin client since,
 * like agency signup, the new user has no agency-scoped session yet.
 */
export async function inviteOwner(ownerId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: owner } = await supabase.from("owners").select("email, name").eq("id", ownerId).single();
  if (!owner?.email) {
    redirect(`/proprietaires/${ownerId}?error=${encodeURIComponent("Renseignez un email avant d'inviter le propriétaire")}`);
  }

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(owner!.email!, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/proprietaire`,
  });

  if (error || !invited.user) {
    redirect(`/proprietaires/${ownerId}?error=${encodeURIComponent("Erreur lors de l'envoi de l'invitation")}`);
  }

  await admin.from("users").insert({
    id: invited!.user.id,
    agency_id: user.agency_id,
    email: owner!.email!,
    full_name: owner!.name,
    role: "owner",
    owner_id: ownerId,
  });

  revalidatePath(`/proprietaires/${ownerId}`);
  redirect(`/proprietaires/${ownerId}?invited=1`);
}
