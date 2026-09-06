"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TEMPLATES } from "@/lib/messaging/templates";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const agencyName = String(formData.get("agencyName") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    redirect(`/signup?error=${encodeURIComponent(error?.message ?? "Inscription impossible")}`);
  }

  // Provisioning a brand new agency + its first admin user requires bypassing
  // RLS: at this point the user has no agency_id yet, so the normal policies
  // (which all key off current_agency_id()) would reject the insert.
  const admin = createAdminClient();

  const { data: agency, error: agencyError } = await admin
    .from("agencies")
    .insert({ name: agencyName || `Agence de ${fullName || email}` })
    .select("id")
    .single();

  if (agencyError || !agency) {
    redirect(`/signup?error=${encodeURIComponent("Erreur lors de la création de l'agence")}`);
  }

  const { error: profileError } = await admin.from("users").insert({
    id: data.user!.id,
    agency_id: agency!.id,
    email,
    full_name: fullName || null,
    role: "admin",
  });

  if (profileError) {
    redirect(`/signup?error=${encodeURIComponent("Erreur lors de la création du profil")}`);
  }

  await admin
    .from("message_templates")
    .insert(DEFAULT_TEMPLATES.map((template) => ({ ...template, agency_id: agency!.id })));

  if (!data.session) {
    redirect("/login?error=" + encodeURIComponent("Vérifiez votre email pour confirmer votre compte"));
  }

  redirect("/");
}
